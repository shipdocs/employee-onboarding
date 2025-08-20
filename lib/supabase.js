/**
 * Supabase Migration Layer
 * This file provides a drop-in replacement for lib/supabase.js
 * using the new Docker-only architecture with enhanced compatibility
 */

const db = require('./database-supabase-compat');
const storage = require('./storage-minio');

// Create a Supabase-compatible interface
const supabase = {
  // Database operations - use enhanced compatibility layer
  from: (table) => db.from(table),

  // Storage operations
  storage: {
    from: (bucket) => storage.from(bucket)
  },

  // Auth operations (now handled by JWT)
  auth: {
    signIn: async ({ email, password }) => {
      // This should be handled by your auth endpoints
      console.warn('Auth should be handled by auth endpoints, not Supabase');
      return { error: 'Use auth endpoints instead' };
    },
    signOut: async () => {
      console.warn('Auth should be handled by auth endpoints, not Supabase');
      return { error: 'Use auth endpoints instead' };
    },
    user: () => null,
    session: () => null
  },

  // Direct query access
  query: db.query,
  transaction: db.transaction,
  helpers: db.helpers
};

// Export both named and default
module.exports = { supabase };
module.exports.default = supabase;
