/**
 * Enhanced Supabase Compatibility Layer
 * Provides full Supabase-like API for smooth migration from Supabase to direct PostgreSQL
 */

const { Pool } = require('pg');
const queryBuilder = require('./database-query-builder');

// Get pool from database-direct
const db = require('./database-direct');

class SupabaseQueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.selectColumns = '*';
    this.orderByClause = null;
    this.limitValue = null;
    this.offsetValue = null;
    this.singleRow = false;
  }

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  insert(data) {
    return this._executeInsert(data);
  }

  update(data) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  // Filter methods
  eq(column, value) {
    this.filters.push({ column, operator: '=', value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ column, operator: '!=', value });
    return this;
  }

  gt(column, value) {
    this.filters.push({ column, operator: '>', value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ column, operator: '>=', value });
    return this;
  }

  lt(column, value) {
    this.filters.push({ column, operator: '<', value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ column, operator: '<=', value });
    return this;
  }

  like(column, pattern) {
    this.filters.push({ column, operator: 'LIKE', value: pattern });
    return this;
  }

  ilike(column, pattern) {
    this.filters.push({ column, operator: 'ILIKE', value: pattern });
    return this;
  }

  in(column, values) {
    this.filters.push({ column, operator: 'IN', value: values });
    return this;
  }

  is(column, value) {
    if (value === null) {
      this.filters.push({ column, operator: 'IS NULL', value: null });
    } else {
      this.filters.push({ column, operator: '=', value });
    }
    return this;
  }

  or(conditions) {
    // Store OR conditions for later processing
    this.filters.push({ type: 'or', conditions });
    return this;
  }

  and(conditions) {
    // Store AND conditions for later processing
    this.filters.push({ type: 'and', conditions });
    return this;
  }

  // Ordering and pagination
  order(column, options = {}) {
    const direction = options.ascending === false ? 'DESC' : 'ASC';
    this.orderByClause = `${column} ${direction}`;
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  range(from, to) {
    this.offsetValue = from;
    this.limitValue = to - from + 1;
    return this;
  }

  single() {
    this.singleRow = true;
    this.limitValue = 1;
    return this;
  }

  // Build WHERE clause from filters
  _buildWhereClause() {
    if (this.filters.length === 0) return { text: '', params: [], paramIndex: 1 };

    let whereClause = ' WHERE ';
    let params = [];
    let paramIndex = 1;
    let conditions = [];

    for (const filter of this.filters) {
      if (filter.type === 'or' || filter.type === 'and') {
        // Handle complex OR/AND conditions
        const subConditions = [];
        for (const [col, val] of Object.entries(filter.conditions)) {
          subConditions.push(`${col} = $${paramIndex}`);
          params.push(val);
          paramIndex++;
        }
        const connector = filter.type === 'or' ? ' OR ' : ' AND ';
        conditions.push(`(${subConditions.join(connector)})`);
      } else {
        // Handle simple conditions
        if (filter.operator === 'IS NULL') {
          conditions.push(`${filter.column} IS NULL`);
        } else if (filter.operator === 'IS NOT NULL') {
          conditions.push(`${filter.column} IS NOT NULL`);
        } else if (filter.operator === 'IN') {
          const placeholders = filter.value.map((_, i) => `$${paramIndex + i}`).join(', ');
          conditions.push(`${filter.column} IN (${placeholders})`);
          params.push(...filter.value);
          paramIndex += filter.value.length;
        } else {
          conditions.push(`${filter.column} ${filter.operator} $${paramIndex}`);
          params.push(filter.value);
          paramIndex++;
        }
      }
    }

    whereClause += conditions.join(' AND ');
    return { text: whereClause, params, paramIndex };
  }

  // Execute methods
  async _executeSelect() {
    try {
      let query = `SELECT ${this.selectColumns} FROM ${this.table}`;

      const whereClause = this._buildWhereClause();
      query += whereClause.text;
      const params = whereClause.params;

      if (this.orderByClause) {
        query += ` ORDER BY ${this.orderByClause}`;
      }

      if (this.limitValue) {
        query += ` LIMIT ${this.limitValue}`;
      }

      if (this.offsetValue) {
        query += ` OFFSET ${this.offsetValue}`;
      }

      const result = await db.query(query, params);

      if (this.singleRow) {
        return {
          data: result.rows[0] || null,
          error: null
        };
      }

      return {
        data: result.rows,
        error: null
      };
    } catch (error) {
      console.error('Select error:', error);
      return {
        data: null,
        error: error.message
      };
    }
  }

  async _executeInsert(data) {
    try {
      const records = Array.isArray(data) ? data : [data];
      const results = [];

      for (const record of records) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `
          INSERT INTO ${this.table} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;

        const result = await db.query(query, values);
        results.push(result.rows[0]);
      }

      return {
        data: Array.isArray(data) ? results : results[0],
        error: null
      };
    } catch (error) {
      console.error('Insert error:', error);
      return {
        data: null,
        error: error.message
      };
    }
  }

  async _executeUpdate() {
    try {
      const columns = Object.keys(this.updateData);
      const values = Object.values(this.updateData);

      let query = `UPDATE ${this.table} SET `;
      const setClauses = columns.map((col, i) => `${col} = $${i + 1}`);
      query += setClauses.join(', ');

      const whereClause = this._buildWhereClause();
      // Adjust parameter indices for WHERE clause
      const adjustedWhereText = whereClause.text.replace(/\$(\d+)/g, (match, num) => {
        return `$${parseInt(num) + values.length}`;
      });

      query += adjustedWhereText;
      query += ' RETURNING *';

      const allParams = [...values, ...whereClause.params];
      const result = await db.query(query, allParams);

      return {
        data: result.rows,
        error: null
      };
    } catch (error) {
      console.error('Update error:', error);
      return {
        data: null,
        error: error.message
      };
    }
  }

  async _executeDelete() {
    try {
      let query = `DELETE FROM ${this.table}`;

      const whereClause = this._buildWhereClause();
      query += whereClause.text;
      query += ' RETURNING *';

      const result = await db.query(query, whereClause.params);

      return {
        data: result.rows,
        error: null
      };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        data: null,
        error: error.message
      };
    }
  }

  // Main execution method - for backwards compatibility
  async execute() {
    if (this.isDelete) {
      return this._executeDelete();
    } else if (this.updateData) {
      return this._executeUpdate();
    } else {
      return this._executeSelect();
    }
  }

  // Aliases for common patterns
  async then(resolve, reject) {
    try {
      const result = await this.execute();
      if (resolve) resolve(result);
      return result;
    } catch (error) {
      if (reject) reject(error);
      throw error;
    }
  }
}

// Main compatibility wrapper
const supabaseCompat = {
  from(table) {
    return new SupabaseQueryBuilder(table);
  }
};

// Re-export database utilities
supabaseCompat.query = db.query;
supabaseCompat.transaction = db.transaction;
supabaseCompat.helpers = db.helpers;

module.exports = {
  supabase: supabaseCompat,
  SupabaseQueryBuilder
};
