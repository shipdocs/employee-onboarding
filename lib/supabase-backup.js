// Wrapper for Supabase/PostgREST API with direct fetch
const fetch = require('node-fetch');

class SupabaseWrapper {
  constructor() {
    this.baseUrl = process.env.SUPABASE_URL || 'http://supabase_api:3000';
    this.apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  }

  from(table) {
    return new QueryBuilder(this.baseUrl, this.apiKey, table);
  }
}

class QueryBuilder {
  constructor(baseUrl, apiKey, table) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.table = table;
    this.filters = [];
    this.selectColumns = '*';
    this.singleResult = false;
  }

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column, value) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  neq(column, value) {
    this.filters.push(`${column}=neq.${encodeURIComponent(value)}`);
    return this;
  }

  gt(column, value) {
    this.filters.push(`${column}=gt.${value}`);
    return this;
  }

  lt(column, value) {
    this.filters.push(`${column}=lt.${value}`);
    return this;
  }

  gte(column, value) {
    this.filters.push(`${column}=gte.${value}`);
    return this;
  }

  lte(column, value) {
    this.filters.push(`${column}=lte.${value}`);
    return this;
  }

  is(column, value) {
    this.filters.push(`${column}=is.${value}`);
    return this;
  }

  order(column, options = {}) {
    const ascending = options.ascending !== false;
    this.filters.push(`order=${column}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  limit(count) {
    this.filters.push(`limit=${count}`);
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  async insert(data) {
    try {
      const url = `${this.baseUrl}/${this.table}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(Array.isArray(data) ? data : [data])
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: { message: errorText, status: response.status } };
      }

      const result = await response.json();
      return { data: Array.isArray(data) ? result : result[0], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async update(data) {
    try {
      const queryString = this.filters.length > 0 ? `?${this.filters.join('&')}` : '';
      const url = `${this.baseUrl}/${this.table}${queryString}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: { message: errorText, status: response.status } };
      }

      const result = await response.json();
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async delete() {
    try {
      const queryString = this.filters.length > 0 ? `?${this.filters.join('&')}` : '';
      const url = `${this.baseUrl}/${this.table}${queryString}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: { message: errorText, status: response.status } };
      }

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async execute() {
    try {
      const queryParams = [`select=${this.selectColumns}`, ...this.filters];
      const queryString = queryParams.join('&');
      const url = `${this.baseUrl}/${this.table}?${queryString}`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: { message: errorText, status: response.status } };
      }

      const data = await response.json();
      
      if (this.singleResult) {
        if (data.length === 0) {
          return { data: null, error: { message: 'No rows returned', code: 'PGRST116' } };
        }
        return { data: data[0], error: null };
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  // Make the query builder thenable for async/await
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

// Create wrapper instance
const supabaseWrapper = new SupabaseWrapper();

// Also export the original Supabase client for compatibility
let supabase;
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || 'http://supabase_api:3000';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  });
} catch (e) {
  console.warn('Original Supabase client could not be created, using wrapper only');
  supabase = supabaseWrapper;
}

module.exports = {
  supabase: supabaseWrapper,  // Use wrapper as primary
  supabaseClient: supabaseWrapper,
  supabaseOriginal: supabase,  // Keep original for backward compatibility
  SupabaseWrapper
};