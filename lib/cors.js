// lib/cors.js - CORS middleware for API endpoints

const allowedOrigins = [
  'https://maritime-onboarding.example.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

// Add Vercel preview URLs dynamically
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

/**
 * Apply CORS headers to response
 * @param {Request} req - HTTP request
 * @param {Response} res - HTTP response
 * @returns {boolean} - Returns true if request should continue, false if it was a preflight
 */
function applyCors(req, res) {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow any localhost origin
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  
  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  
  return true;
}

module.exports = { applyCors, allowedOrigins };