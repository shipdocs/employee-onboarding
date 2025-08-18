// Maritime Onboarding System - Express Server
// Custom server to replace Vercel for Docker deployment

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// SECURITY: Removed dangerous runtime file system patching.
// If there are issues with path-to-regexp, they should be handled properly:
// 1. Update to a newer version that fixes the issue
// 2. Use try-catch blocks around route registration
// 3. Validate route patterns before registration
// Runtime patching of node_modules is a critical security vulnerability.

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:80'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Redis-based rate limiter
const rateLimiter = require('./lib/rate-limiter');

// Initialize rate limiter on startup
(async () => {
  await rateLimiter.init();
  
  // Create rate limiting instances
  const limiters = rateLimiter.createLimiters();
  global.apiRateLimit = limiters.api;
  global.adminRateLimit = limiters.admin;
  global.authRateLimit = limiters.auth;
  global.uploadRateLimit = limiters.upload;
  global.passwordResetRateLimit = limiters.passwordReset;
  global.emailRateLimit = limiters.email;
})();

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
        try {
          app.all(basePath, expressHandler);
          console.log(`✅ Loaded API route: ${basePath} (from index.js)`);
        } catch (routeError) {
          console.error(`❌ Failed to register route ${basePath}:`, routeError.message);
          // Continue loading other routes even if one fails
        }
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
              try {
                app.all(`${basePath}/:${param}`, expressHandler);
                console.log(`✅ Loaded dynamic route: ${basePath}/:${param}`);
              } catch (routeError) {
                console.error(`❌ Failed to register dynamic route ${basePath}/:${param}:`, routeError.message);
              }
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
                try {
                  app.all(`${basePath}/:${param}/${routeName}`, expressHandler);
                  console.log(`✅ Loaded dynamic nested route: ${basePath}/:${param}/${routeName}`);
                } catch (routeError) {
                  console.error(`❌ Failed to register nested route ${basePath}/:${param}/${routeName}:`, routeError.message);
                }
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
        // Try loading it as a dynamic route file
        const match = item.match(/\[([^\]]+)\]\.js$/);
        if (match) {
          const param = match[1];
          const itemFilePath = path.join(dir, item);
          try {
            delete require.cache[require.resolve(itemFilePath)];
            const handler = require(itemFilePath);
            
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
              try {
                app.all(`${basePath}/:${param}`, expressHandler);
                console.log(`✅ Loaded dynamic route file: ${basePath}/:${param}`);
              } catch (routeError) {
                console.error(`❌ Failed to register route ${basePath}/:${param}:`, routeError.message);
              }
            }
          } catch (error) {
            console.log(`⚠️  Failed to load ${item}: ${error.message}`);
          }
        }
        return;
      }

      // Load individual API files
      const routeName = item.replace('.js', '');
      // Don't add 'index' to the route path
      const routePath = routeName === 'index' ? basePath : `${basePath}/${routeName}`;
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
          try {
            app.all(routePath, expressHandler);
            console.log(`✅ Loaded API route: ${routePath}`);
          } catch (routeError) {
            console.error(`❌ Failed to register route ${routePath}:`, routeError.message);
          }
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
          try {
            app.all(routePath, expressHandler);
            console.log(`✅ Loaded API route (default): ${routePath}`);
          } catch (routeError) {
            console.error(`❌ Failed to register route ${routePath}:`, routeError.message);
          }
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

// Initialize centralized error handler
const errorHandler = require('./lib/error-handler');

// Setup global error handlers
errorHandler.handleUncaughtException();
errorHandler.handleUnhandledRejection();

// Use centralized error handling middleware
app.use(errorHandler.middleware());

// Start server
app.listen(PORT, () => {
  console.log(`
🚢 Maritime Onboarding System Server
📍 Running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
⚡ Ready to handle requests!
  `);
});