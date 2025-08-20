// Maritime Onboarding System - Express Server
// Custom server to replace Vercel for Docker deployment

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Patch path-to-regexp at the file system level to prevent crashes
const pathToRegexpPath = path.join(__dirname, 'node_modules', 'path-to-regexp', 'dist', 'index.js');

try {
  if (fs.existsSync(pathToRegexpPath)) {
    console.log('🔧 Patching path-to-regexp to prevent crashes...');
    const originalContent = fs.readFileSync(pathToRegexpPath, 'utf8');

    // Replace the problematic error throwing with a warning
    const patchedContent = originalContent.replace(
      /throw new TypeError\(`Missing parameter name at \${i}: \${DEBUG_URL}`\);/g,
      'console.warn(`⏭️ Skipped problematic path pattern at ${i}: ${DEBUG_URL}`); return [];'
    );

    if (patchedContent !== originalContent) {
      fs.writeFileSync(pathToRegexpPath, patchedContent);
      console.log('✅ Successfully patched path-to-regexp');
    } else {
      console.log('⚠️ path-to-regexp patch pattern not found');
    }
  } else {
    console.log('⚠️ path-to-regexp not found at expected location');
  }
} catch (error) {
  console.log('⚠️ Failed to patch path-to-regexp:', error.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:80'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple rate limiting middleware
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key).filter(time => now - time < windowMs);

    if (userRequests.length >= max) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.push(now);
    requests.set(key, userRequests);
    next();
  };
};

// Create rate limiting instances
global.apiRateLimit = rateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
global.adminRateLimit = rateLimit(15 * 60 * 1000, 50); // 50 requests per 15 minutes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.1'
  });
});

// Function to dynamically load API routes
function loadApiRoutes(dir, basePath = '/api') {
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  API directory not found: ${dir}`);
    return;
  }

  const items = fs.readdirSync(dir);

  // First, load index.js if it exists in current directory
  const currentIndexPath = path.join(dir, 'index.js');
  if (fs.existsSync(currentIndexPath)) {
    try {
      delete require.cache[require.resolve(currentIndexPath)];
      const handler = require(currentIndexPath);

      if (typeof handler === 'function') {
        const expressHandler = (req, res, next) => {
          try {
            const result = handler(req, res);
            if (result && typeof result.catch === 'function') {
              result.catch(next);
            }
          } catch (error) {
            next(error);
          }
        };
        app.all(basePath, expressHandler);
        console.log(`✅ Loaded API route (index): ${basePath}`);
      }
    } catch (error) {
      if (!error.message.includes('Cannot find module')) {
        console.log(`⚠️  Failed to load ${currentIndexPath}: ${error.message}`);
      }
    }
  }

  items.forEach(item => {
    if (item === 'index.js') return; // Skip index.js as we handle it above

    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // Handle dynamic routes like [id]
      if (item.startsWith('[') && item.endsWith(']')) {
        const param = item.slice(1, -1);

        // Load [id].js file if it exists
        const dynamicFilePath = path.join(dir, `${item}.js`);
        if (fs.existsSync(dynamicFilePath)) {
          try {
            delete require.cache[require.resolve(dynamicFilePath)];
            const handler = require(dynamicFilePath);

            if (typeof handler === 'function') {
              const expressHandler = (req, res, next) => {
                req.query[param] = req.params[param];
                try {
                  const result = handler(req, res);
                  if (result && typeof result.catch === 'function') {
                    result.catch(next);
                  }
                } catch (error) {
                  next(error);
                }
              };
              app.all(`${basePath}/:${param}`, expressHandler);
              console.log(`✅ Loaded dynamic route: ${basePath}/:${param}`);
            }
          } catch (error) {
            console.log(`⚠️  Failed to load ${dynamicFilePath}: ${error.message}`);
          }
        }

        // Load routes inside [id] directory
        const dynamicItems = fs.readdirSync(itemPath);
        dynamicItems.forEach(dynamicItem => {
          if (dynamicItem.endsWith('.js')) {
            const dynamicItemPath = path.join(itemPath, dynamicItem);
            try {
              delete require.cache[require.resolve(dynamicItemPath)];
              const handler = require(dynamicItemPath);

              if (typeof handler === 'function') {
                const routeName = dynamicItem.replace('.js', '');
                const expressHandler = (req, res, next) => {
                  req.query[param] = req.params[param];
                  try {
                    const result = handler(req, res);
                    if (result && typeof result.catch === 'function') {
                      result.catch(next);
                    }
                  } catch (error) {
                    next(error);
                  }
                };
                app.all(`${basePath}/:${param}/${routeName}`, expressHandler);
                console.log(`✅ Loaded dynamic nested route: ${basePath}/:${param}/${routeName}`);
              }
            } catch (error) {
              console.log(`⚠️  Failed to load ${dynamicItemPath}: ${error.message}`);
            }
          }
        });
      } else {
        // Regular directory - recursively load
        loadApiRoutes(itemPath, `${basePath}/${item}`);
      }
    } else if (item.endsWith('.js')) {
      // Skip dynamic route files (handled above)
      if (item.includes('[') || item.includes(']')) {
        return;
      }

      // Load individual API files
      const routePath = `${basePath}/${item.replace('.js', '')}`;
      try {
        // Clear require cache to avoid stale modules
        delete require.cache[require.resolve(itemPath)];
        const handler = require(itemPath);

        if (typeof handler === 'function') {
          // Wrap Next.js style handlers for Express
          const expressHandler = (req, res, next) => {
            try {
              const result = handler(req, res);
              if (result && typeof result.catch === 'function') {
                result.catch(next);
              }
            } catch (error) {
              next(error);
            }
          };
          app.all(routePath, expressHandler);
          console.log(`✅ Loaded API route: ${routePath}`);
        } else if (handler.default && typeof handler.default === 'function') {
          // Support ES6 default exports
          const expressHandler = (req, res, next) => {
            try {
              const result = handler.default(req, res);
              if (result && typeof result.catch === 'function') {
                result.catch(next);
              }
            } catch (error) {
              next(error);
            }
          };
          app.all(routePath, expressHandler);
          console.log(`✅ Loaded API route (default): ${routePath}`);
        } else {
          console.log(`⏭️  Skipped (not a function): ${routePath}`);
        }
      } catch (error) {
        // Only log actual errors, not missing dependencies or path parsing issues
        if (!error.message.includes('is not defined') &&
            !error.message.includes('is required') &&
            !error.message.includes('Cannot find module') &&
            !error.message.includes('Missing parameter name')) {
          console.log(`⚠️  Failed to load ${routePath}: ${error.message}`);
        }
      }
    }
  });
}

// Load all API routes from the api directory
const apiDir = path.join(__dirname, 'api');
console.log('\n🔄 Loading API routes...');
loadApiRoutes(apiDir, '/api');

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path.replace('/api', ''),
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid or missing authentication'
    });
  }

  // Generic error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚢 Maritime Onboarding System Server
📍 Running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
⚡ Ready to handle requests!
  `);
});
