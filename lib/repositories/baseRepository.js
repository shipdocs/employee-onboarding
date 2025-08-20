// Base repository for common database operations
const { supabase } = require('../supabase');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.supabase = supabase;
  }

  // Get all records with optional filters
  async findAll(filters = {}, options = {}) {
    let query = this.supabase.from(this.tableName).select(options.select || '*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending !== false
      });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // Get single record by ID
  async findById(id, options = {}) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(options.select || '*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Get single record by filters
  async findOne(filters, options = {}) {
    let query = this.supabase.from(this.tableName).select(options.select || '*');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query.single();

    if (error) throw error;
    return data;
  }

  // Create new record
  async create(data) {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  // Update record by ID
  async update(id, data) {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  // Delete record by ID
  async delete(id) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Count records with optional filters
  async count(filters = {}) {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }

  // Batch insert
  async createMany(dataArray) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(dataArray)
      .select();

    if (error) throw error;
    return data;
  }

  // Check if record exists
  async exists(filters) {
    const count = await this.count(filters);
    return count > 0;
  }
}

module.exports = BaseRepository;
