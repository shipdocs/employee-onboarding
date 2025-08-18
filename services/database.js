// services/database.js - Supabase-only database service
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - REQUIRED
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=60, max=1000'
    }
  },
  // Connection pooling and performance optimization
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database service with unified interface
class DatabaseService {
  constructor() {
    this.client = supabase;
    this.maxRetries = 3;
    this.retryDelay = 300; // ms
    this.connectionTimeout = 10000; // 10 seconds
    this.queryTimeout = 30000; // 30 seconds
  }

  // Helper method for exponential backoff retry
  async withRetry(operation, retries = this.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      // Don't retry if we're out of retries or if it's not a connection error
      if (
        retries <= 0 ||
        !this.isRetryableError(error)
      ) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = this.retryDelay * Math.pow(2, this.maxRetries - retries) * (0.5 + Math.random() * 0.5);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry with one fewer retry remaining
      return this.withRetry(operation, retries - 1);
    }
  }

  // Determine if an error is retryable
  isRetryableError(error) {
    // Connection-related errors that should be retried
    const retryableErrors = [
      'connection timeout',
      'connection refused',
      'too many connections',
      'could not connect',
      'connection reset',
      'connection closed',
      'pool timeout',
      'database is restarting'
    ];

    return error && error.message &&
      retryableErrors.some(msg => error.message.toLowerCase().includes(msg));
  }

  // Generic query method with retry logic
  async query(sql, params = []) {
    return this.withRetry(async () => {
      const { data, error } = await this.client.rpc('execute_sql', {
        sql_query: sql,
        params: params
      });

      if (error) throw error;
      return data;
    });
  }

  // User operations with retry logic
  async getUsers(filters = {}) {
    return this.withRetry(async () => {
      let query = this.client.from('users').select('*');

      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
  }

  async getUserById(id) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getUserByEmail(email) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }

  async createUser(userData) {
    const { data, error } = await this.client
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id, userData) {
    const { data, error } = await this.client
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteUser(id) {
    const { error } = await this.client
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // Template operations
  async getTemplates(userId) {
    const { data, error } = await this.client
      .from('pdf_templates')
      .select('*')
      .eq('created_by', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getTemplateById(id, userId) {
    const { data, error } = await this.client
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .eq('created_by', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async createTemplate(templateData) {
    const { data, error } = await this.client
      .from('pdf_templates')
      .insert([templateData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTemplate(id, templateData, userId) {
    const { data, error } = await this.client
      .from('pdf_templates')
      .update(templateData)
      .eq('id', id)
      .eq('created_by', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTemplate(id, userId) {
    const { error } = await this.client
      .from('pdf_templates')
      .delete()
      .eq('id', id)
      .eq('created_by', userId);

    if (error) throw error;
    return { success: true };
  }

  // Magic links operations
  async createMagicLink(linkData) {
    const { data, error } = await this.client
      .from('magic_links')
      .insert([linkData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMagicLink(token) {
    const { data, error } = await this.client
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async useMagicLink(token) {
    const { data, error } = await this.client
      .from('magic_links')
      .update({ used: true })
      .eq('token', token)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Training operations
  async getTrainingSessions(userId) {
    const { data, error } = await this.client
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  async createTrainingSession(sessionData) {
    const { data, error } = await this.client
      .from('training_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Quiz operations
  async getQuizResults(userId, phase = null) {
    let query = this.client
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId);

    if (phase) {
      query = query.eq('phase', phase);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createQuizResult(resultData) {
    const { data, error } = await this.client
      .from('quiz_results')
      .insert([resultData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Health check
  async healthCheck() {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('count')
        .limit(1);

      return { healthy: !error, error: error?.message };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();

module.exports = {
  DatabaseService,
  databaseService,
  supabase
};
