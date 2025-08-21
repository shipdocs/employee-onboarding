// pages/api/csp-report.js - CSP violation report endpoint

const { createCSPReportHandler } = require('../../lib/security/cspSecurity');
const { supabase } = require('../../lib/database-supabase-compat');

// Create the CSP report handler with database logging
const handler = createCSPReportHandler({
  logToConsole: true,
  logToDatabase: true,
  supabase: supabase
});

module.exports = handler;
