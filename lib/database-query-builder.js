/**
 * Secure Database Query Builder
 * Prevents SQL injection by validating and sanitizing inputs
 */

class QueryBuilder {
  constructor() {
    // Whitelist of allowed tables
    this.ALLOWED_TABLES = [
      'users', 'managers', 'manager_permissions', 'crew_assignments',
      'workflows', 'workflow_phases', 'workflow_instances', 'workflow_progress',
      'training_items', 'training_sessions', 'quiz_content', 'quiz_results', 'quiz_history',
      'forms', 'certificates', 'content_media', 'content_versions',
      'magic_links', 'token_blacklist', 'audit_log', 'security_events',
      'user_mfa_settings', 'mfa_failure_log', 'user_sessions', 'refresh_tokens',
      'password_history', 'api_logs', 'error_logs', 'email_logs', 'email_notifications',
      'file_uploads', 'maritime_terminology', 'translation_memory',
      'system_settings', 'system_notifications', 'feature_flags',
      'pdf_templates'
    ];

    // Whitelist of allowed operators
    this.ALLOWED_OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'];

    // Regex for validating column names (alphanumeric, underscore only)
    this.COLUMN_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    // Regex for validating sort orders
    this.SORT_ORDER_REGEX = /^(ASC|DESC|asc|desc)$/;
  }

  /**
   * Validate table name against whitelist
   */
  validateTable(table) {
    if (!this.ALLOWED_TABLES.includes(table)) {
      throw new Error(`Invalid table name: ${table}. Table not in whitelist.`);
    }
    return table;
  }

  /**
   * Validate column name format
   */
  validateColumn(column) {
    if (!this.COLUMN_NAME_REGEX.test(column)) {
      throw new Error(`Invalid column name: ${column}. Column names must be alphanumeric with underscores only.`);
    }
    return column;
  }

  /**
   * Validate operator
   */
  validateOperator(operator) {
    if (!this.ALLOWED_OPERATORS.includes(operator.toUpperCase())) {
      throw new Error(`Invalid operator: ${operator}. Use one of: ${this.ALLOWED_OPERATORS.join(', ')}`);
    }
    return operator;
  }

  /**
   * Build SELECT query
   */
  buildSelect(table, options = {}) {
    const validTable = this.validateTable(table);

    // Validate columns
    let columns = '*';
    if (options.columns && Array.isArray(options.columns)) {
      columns = options.columns.map(col => this.validateColumn(col)).join(', ');
    }

    let query = `SELECT ${columns} FROM ${validTable}`;
    const params = [];
    let paramIndex = 1;

    // Add WHERE clause
    if (options.where) {
      const whereClauses = [];
      for (const [column, value] of Object.entries(options.where)) {
        this.validateColumn(column);
        if (value === null) {
          whereClauses.push(`${column} IS NULL`);
        } else if (value === undefined) {
          continue;
        } else {
          whereClauses.push(`${column} = $${paramIndex++}`);
          params.push(value);
        }
      }
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }

    // Add ORDER BY
    if (options.orderBy) {
      const orderParts = [];
      for (const [column, direction] of Object.entries(options.orderBy)) {
        this.validateColumn(column);
        if (!this.SORT_ORDER_REGEX.test(direction)) {
          throw new Error(`Invalid sort direction: ${direction}`);
        }
        orderParts.push(`${column} ${direction.toUpperCase()}`);
      }
      if (orderParts.length > 0) {
        query += ` ORDER BY ${orderParts.join(', ')}`;
      }
    }

    // Add LIMIT
    if (options.limit) {
      const limit = parseInt(options.limit);
      if (isNaN(limit) || limit < 1) {
        throw new Error('Invalid limit value');
      }
      query += ` LIMIT ${limit}`;
    }

    // Add OFFSET
    if (options.offset) {
      const offset = parseInt(options.offset);
      if (isNaN(offset) || offset < 0) {
        throw new Error('Invalid offset value');
      }
      query += ` OFFSET ${offset}`;
    }

    return { text: query, params };
  }

  /**
   * Build INSERT query
   */
  buildInsert(table, data, options = {}) {
    const validTable = this.validateTable(table);

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('Insert data cannot be empty');
    }

    const columns = [];
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (const [column, value] of Object.entries(data)) {
      this.validateColumn(column);
      columns.push(column);
      values.push(value);
      placeholders.push(`$${paramIndex++}`);
    }

    let query = `INSERT INTO ${validTable} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    if (options.returning !== false) {
      query += ' RETURNING *';
    }

    return { text: query, params: values };
  }

  /**
   * Build UPDATE query
   */
  buildUpdate(table, data, where, options = {}) {
    const validTable = this.validateTable(table);

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('Update data cannot be empty');
    }

    if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
      throw new Error('Update WHERE clause cannot be empty (unsafe operation)');
    }

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    // Build SET clause
    for (const [column, value] of Object.entries(data)) {
      this.validateColumn(column);
      setClauses.push(`${column} = $${paramIndex++}`);
      params.push(value);
    }

    // Build WHERE clause
    const whereClauses = [];
    for (const [column, value] of Object.entries(where)) {
      this.validateColumn(column);
      if (value === null) {
        whereClauses.push(`${column} IS NULL`);
      } else {
        whereClauses.push(`${column} = $${paramIndex++}`);
        params.push(value);
      }
    }

    let query = `UPDATE ${validTable} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;

    if (options.returning !== false) {
      query += ' RETURNING *';
    }

    return { text: query, params };
  }

  /**
   * Build DELETE query
   */
  buildDelete(table, where, options = {}) {
    const validTable = this.validateTable(table);

    if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
      throw new Error('Delete WHERE clause cannot be empty (unsafe operation)');
    }

    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [column, value] of Object.entries(where)) {
      this.validateColumn(column);
      if (value === null) {
        whereClauses.push(`${column} IS NULL`);
      } else {
        whereClauses.push(`${column} = $${paramIndex++}`);
        params.push(value);
      }
    }

    let query = `DELETE FROM ${validTable} WHERE ${whereClauses.join(' AND ')}`;

    if (options.returning) {
      query += ' RETURNING *';
    }

    return { text: query, params };
  }

  /**
   * Build a complex query with joins
   */
  buildComplexQuery(config) {
    // This is for more complex queries that need joins
    // Still validates all inputs
    const { table, joins, where, columns, orderBy, limit } = config;

    const validTable = this.validateTable(table);
    let query = 'SELECT ';
    const params = [];
    let paramIndex = 1;

    // Columns
    if (columns && Array.isArray(columns)) {
      query += columns.map(col => {
        if (col.includes('.')) {
          const [tbl, column] = col.split('.');
          this.validateTable(tbl);
          this.validateColumn(column);
          return `${tbl}.${column}`;
        }
        this.validateColumn(col);
        return col;
      }).join(', ');
    } else {
      query += '*';
    }

    query += ` FROM ${validTable}`;

    // Joins
    if (joins && Array.isArray(joins)) {
      for (const join of joins) {
        const joinTable = this.validateTable(join.table);
        const joinType = join.type || 'INNER';
        if (!['INNER', 'LEFT', 'RIGHT', 'FULL'].includes(joinType.toUpperCase())) {
          throw new Error(`Invalid join type: ${joinType}`);
        }

        // Validate join conditions
        const onParts = [];
        for (const condition of join.on) {
          const [left, right] = condition.split('=').map(s => s.trim());
          // Validate both sides of the condition
          const validateJoinColumn = (col) => {
            if (col.includes('.')) {
              const [tbl, column] = col.split('.');
              this.validateTable(tbl);
              this.validateColumn(column);
              return `${tbl}.${column}`;
            }
            this.validateColumn(col);
            return col;
          };
          onParts.push(`${validateJoinColumn(left)} = ${validateJoinColumn(right)}`);
        }

        query += ` ${joinType} JOIN ${joinTable} ON ${onParts.join(' AND ')}`;
      }
    }

    // WHERE clause
    if (where) {
      const whereClauses = [];
      for (const [column, value] of Object.entries(where)) {
        const validCol = column.includes('.')
          ? column.split('.').map((part, i) => i === 0 ? this.validateTable(part) : this.validateColumn(part)).join('.')
          : this.validateColumn(column);

        if (value === null) {
          whereClauses.push(`${validCol} IS NULL`);
        } else {
          whereClauses.push(`${validCol} = $${paramIndex++}`);
          params.push(value);
        }
      }
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }

    // ORDER BY
    if (orderBy) {
      const orderParts = [];
      for (const [column, direction] of Object.entries(orderBy)) {
        const validCol = column.includes('.')
          ? column.split('.').map((part, i) => i === 0 ? this.validateTable(part) : this.validateColumn(part)).join('.')
          : this.validateColumn(column);

        if (!this.SORT_ORDER_REGEX.test(direction)) {
          throw new Error(`Invalid sort direction: ${direction}`);
        }
        orderParts.push(`${validCol} ${direction.toUpperCase()}`);
      }
      if (orderParts.length > 0) {
        query += ` ORDER BY ${orderParts.join(', ')}`;
      }
    }

    // LIMIT
    if (limit) {
      const limitVal = parseInt(limit);
      if (isNaN(limitVal) || limitVal < 1) {
        throw new Error('Invalid limit value');
      }
      query += ` LIMIT ${limitVal}`;
    }

    return { text: query, params };
  }
}

// Export singleton instance
module.exports = new QueryBuilder();
