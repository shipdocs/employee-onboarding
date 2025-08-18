const { apiRateLimit } = require('../lib/rateLimit');

async function handler(req, res) {
  try {
    console.log('🔍 [TEST] Environment check starting...');

    // Check environment variables
    const envCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      JWT_SECRET: !!process.env.JWT_SECRET
    };

    console.log('🔍 [TEST] Environment variables:', envCheck);

    // Test basic imports
    console.log('🔍 [TEST] Testing supabase client import...');
    const { supabase } = await import('./lib/supabase.js');
    console.log('✅ [TEST] supabase client imported successfully');

    console.log('🔍 [TEST] Testing verifyAuth import...');
    const { verifyAuth } = await import('./lib/auth.js');
    console.log('✅ [TEST] verifyAuth imported successfully');

    // Test database connection
    console.log('🔍 [TEST] Testing database connection...');
    const { data, error } = await supabase
      .from('training_phases')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ [TEST] Database error:', error.message);
    } else {
      console.log('✅ [TEST] Database connection successful');
    }

    return res.status(200).json({
      status: 'success',
      environment: envCheck,
      database: error ? { error: error.message } : { success: true },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [TEST] Critical error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [TEST] Stack trace:', error.stack);
    }

    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

// Simple test endpoint to check environment and imports
module.exports = apiRateLimit(handler);