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
 * Helper functions for common operations
 */
const helpers = {
  /**
   * Insert a record
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Inserted record
   */
  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    
    const text = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows[0];
  },

  /**
   * Update records
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} where - Where conditions
   * @returns {Promise<Array>} Updated records
   */
  async update(table, data, where) {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    
    const setClause = dataKeys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');
    
    const whereClause = whereKeys
      .map((key, i) => `${key} = $${dataValues.length + i + 1}`)
      .join(' AND ');
    
    const text = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;
    
    const result = await query(text, [...dataValues, ...whereValues]);
    return result.rows;
  },

  /**
   * Select records
   * @param {string} table - Table name
   * @param {Object} where - Where conditions
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Selected records
   */
  async select(table, where = {}, options = {}) {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    
    let text = `SELECT ${options.columns || '*'} FROM ${table}`;
    
    if (whereKeys.length > 0) {
      const whereClause = whereKeys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(' AND ');
      text += ` WHERE ${whereClause}`;
    }
    
    if (options.orderBy) {
      text += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options.limit) {
      text += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      text += ` OFFSET ${options.offset}`;
    }
    
    const result = await query(text, whereValues);
    return result.rows;
  },

  /**
   * Delete records
   * @param {string} table - Table name
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} Number of deleted records
   */
  async delete(table, where) {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    
    const whereClause = whereKeys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(' AND ');
    
    const text = `
      DELETE FROM ${table}
      WHERE ${whereClause}
      RETURNING *
    `;
    
    const result = await query(text, whereValues);
    return result.rowCount;
  },

  /**
   * Count records
   * @param {string} table - Table name
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} Count
   */
  async count(table, where = {}) {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    
    let text = `SELECT COUNT(*) FROM ${table}`;
    
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