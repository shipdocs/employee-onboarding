// lib/supabase-cjs.js - CommonJS wrapper for Supabase client
// This provides a CommonJS-compatible interface for scripts

const { supabase } = require('./supabase');

// Re-export the supabase client for CommonJS compatibility
module.exports = {
  supabase
};
