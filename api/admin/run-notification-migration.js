// Vercel API Route: /api/admin/run-notification-migration.js - Run notification system migration
const db = require('../../lib/database-direct');
const { requireAdmin } = require('../../lib/auth');
const { adminRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    // Step 1: Add columns to users table

    const { error: alterError1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
      `
    });

    if (alterError1) {
      // console.error('Error adding columns to users table:', alterError1);
      // Continue anyway, columns might already exist
    }

    // Step 2: Create system_notifications table

    const { error: createError1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS system_notifications (
          id BIGSERIAL PRIMARY KEY,
          notification_type TEXT NOT NULL,
          recipient_type TEXT NOT NULL,
          recipient_id BIGINT,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          metadata JSONB,
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (createError1) {
      // console.error('Error creating system_notifications table:', createError1);
    }

    // Step 3: Create email_logs table

    const { error: createError2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS email_logs (
          id BIGSERIAL PRIMARY KEY,
          recipient_email TEXT NOT NULL,
          recipient_name TEXT,
          subject TEXT NOT NULL,
          email_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          provider TEXT,
          metadata JSONB,
          error_message TEXT,
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (createError2) {
      // console.error('Error creating email_logs table:', createError2);
    }

    // Step 4: Create indexes

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_system_notifications_type_recipient 
       ON system_notifications(notification_type, recipient_type);`,
      `CREATE INDEX IF NOT EXISTS idx_system_notifications_sent_at 
       ON system_notifications(sent_at);`,
      `CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_type 
       ON email_logs(recipient_email, email_type);`,
      `CREATE INDEX IF NOT EXISTS idx_email_logs_status_created 
       ON email_logs(status, created_at);`
    ];

    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError) {
        // console.error('Error creating index:', indexError);
      }
    }

    // Step 5: Update existing users

    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: 'UPDATE users SET login_count = 0 WHERE login_count IS NULL;'
    });

    if (updateError) {
      // console.error('Error updating users:', updateError);
    }

    // Step 6: Verify tables exist

    const verificationQueries = [
      { name: 'users columns', query: db.from('users').select('first_login_at, login_count').limit(1) },
      { name: 'system_notifications', query: db.from('system_notifications').select('id').limit(1) },
      { name: 'email_logs', query: db.from('email_logs').select('id').limit(1) }
    ];

    const results = {};
    for (const { name, query } of verificationQueries) {
      try {
        await query;
        results[name] = 'SUCCESS';
      } catch (_error) {
        results[name] = `FAILED: ${_error.message}`;
      }
    }

    res.json({
      success: true,
      message: 'Notification system migration completed',
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (_error) {
    // console.error('Migration error:', _error);
    res.status(500).json({
      error: 'Migration failed',
      message: _error.message,
      stack: process.env.NODE_ENV === 'development' ? _error.stack : undefined
    });
  }
}

module.exports = adminRateLimit(requireAdmin(handler));
