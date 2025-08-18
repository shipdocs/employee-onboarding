// lib/supabase.js - Supabase client configuration (CommonJS for legacy scripts)
const { createClient } = require('@supabase/supabase-js');
const configManager = require('./security/SecureConfigManager');

// Initialize configuration if not already done
if (!configManager.initialized) {
  // For legacy compatibility, fall back to process.env if config manager not initialized
  console.warn('⚠️ [SUPABASE] ConfigManager not initialized, falling back to process.env');
}

const supabaseUrl = configManager.get('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = configManager.get('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Server-side client with service role key for admin operations
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
      'Connection': 'keep-alive'
    }
  },
  // Connection pooling configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Client-side client with anon key for frontend
const supabaseClient = createClient(
  supabaseUrl,
  configManager.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || configManager.get('SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Connection': 'keep-alive'
      }
    },
    // Client-side connection optimization
    realtime: {
      params: {
        eventsPerSecond: 5
      }
    }
  }
);

module.exports = {
  supabase,
  supabaseClient,
  createClient,
  default: supabase
};
