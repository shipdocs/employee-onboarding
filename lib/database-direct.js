/**
 * Direct PostgreSQL Database Client
 * Replaces Supabase with direct database access
 */

const { Pool } = require('pg');
const envValidator = require('./config/env-validator');

// Validate environment before connecting
const envResults = envValidator.validate();
if (!envResults.valid && process.env.NODE_ENV === 'production') {
  throw new Error('Environment validation failed. Cannot initialize database.');
}

// Validate required database environment variables
if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_NAME || 
    !process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error('Missing required database environment variables. Please set DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD');
}

// Create connection pool with optimized settings
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '10'),        // Optimized: reduced from 20
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),  // Optimized: 1 minute
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000'),  // Optimized: 5 seconds
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),  // New: 30 second query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),  // New: 30 second query timeout
});

// Log connection status
pool.on('connect', () => {
  console.log('📊 [DATABASE] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ [DATABASE] Unexpected error:', err);
  process.exit(-1);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executed', {
        duration: `${duration}ms`,
        rows: res.rowCount
      });
    }
    
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Client>} Database client
 */
async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('⚠️ A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };
  
  return client;
}

/**
 * Execute a transaction
 * @param {Function} callback - Transaction callback
 * @returns {Promise<any>} Transaction result
 */
async function transaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper functions for common operations using secure query builder
 */
const queryBuilder = require('./database-query-builder');

const helpers = {
  /**
   * Insert a record (secure)
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Inserted record
   */
  async insert(table, data) {
    const { text, params } = queryBuilder.buildInsert(table, data);
    const result = await query(text, params);
    return result.rows[0];
  },

  /**
   * Update records (secure)
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} where - Where conditions
   * @returns {Promise<Array>} Updated records
   */
  async update(table, data, where) {
    const { text, params } = queryBuilder.buildUpdate(table, data, where);
    const result = await query(text, params);
    return result.rows;
  },

  /**
   * Select records (secure)
   * @param {string} table - Table name
   * @param {Object} where - Where conditions
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Selected records
   */
  async select(table, where = {}, options = {}) {
    const queryOptions = {
      where,
      orderBy: options.orderBy,
      limit: options.limit,
      offset: options.offset,
      columns: options.columns
    };
    
    const { text, params } = queryBuilder.buildSelect(table, queryOptions);
    const result = await query(text, params);
    return result.rows;
  },

  /**
   * Delete records (secure)
   * @param {string} table - Table name
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} Number of deleted records
   */
  async delete(table, where) {
    const { text, params } = queryBuilder.buildDelete(table, where);
    const result = await query(text, params);
    return result.rowCount;
  },

  /**
   * Count records (secure)
   * @param {string} table - Table name
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} Count
   */
  async count(table, where = {}) {
    const queryOptions = {
      where,
      columns: ['COUNT(*) as count']
    };
    
    const { text, params } = queryBuilder.buildSelect(table, queryOptions);
    const result = await query(text, params);
    return parseInt(result.rows[0].count);
    
    if (whereKeys.length > 0) {
      const whereClause = whereKeys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(' AND ');
      text += ` WHERE ${whereClause}`;
    }
    
    const result = await query(text, whereValues);
    return parseInt(result.rows[0].count);
  }
};

/**
 * Supabase-compatible wrapper for easier migration
 */
const supabaseCompat = {
  from(table) {
    return {
      select: (columns = '*') => ({
        eq: (column, value) => ({
          single: async () => {
            const rows = await helpers.select(table, { [column]: value }, { columns, limit: 1 });
            return {
              data: rows[0] || null,
              error: null
            };
          },
          execute: async () => {
            const rows = await helpers.select(table, { [column]: value }, { columns });
            return {
              data: rows,
              error: null
            };
          }
        }),
        execute: async () => {
          const rows = await helpers.select(table, {}, { columns });
          return {
            data: rows,
            error: null
          };
        }
      }),
      insert: async (data) => {
        try {
          const result = Array.isArray(data)
            ? await Promise.all(data.map(d => helpers.insert(table, d)))
            : await helpers.insert(table, data);
          return {
            data: result,
            error: null
          };
        } catch (error) {
          return {
            data: null,
            error: error.message
          };
        }
      },
      update: async (data) => ({
        eq: (column, value) => ({
          execute: async () => {
            try {
              const result = await helpers.update(table, data, { [column]: value });
              return {
                data: result,
                error: null
              };
            } catch (error) {
              return {
                data: null,
                error: error.message
              };
            }
          }
        })
      }),
      delete: () => ({
        eq: (column, value) => ({
          execute: async () => {
            try {
              const count = await helpers.delete(table, { [column]: value });
              return {
                data: { count },
                error: null
              };
            } catch (error) {
              return {
                data: null,
                error: error.message
              };
            }
          }
        })
      })
    };
  }
};

module.exports = {
  query,
  getClient,
  transaction,
  pool,
  helpers,
  supabaseCompat,
  // Export for compatibility during migration
  from: supabaseCompat.from
};