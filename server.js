/**
 * Maritime Onboarding System - Clean Express Server
 * Industry-standard Express routing without Next.js patterns
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const glob = require('glob');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:80'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Health check endpoint - ensure it works even if route loading fails
app.get('/api/health', async (req, res) => {
  try {
    const handler = require('./api/health.js');
    await handler(req, res);
  } catch (error) {
    console.error('Error in /api/health:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});



/**
 * Convert Next.js [param] pattern to Express :param pattern
 */
function convertToExpressRoute(filePath) {
  // Remove api/ prefix and .js suffix
  let route = filePath.replace(/^api/, '').replace(/\.js$/, '');
  
  // Convert [param] to :param
  route = route.replace(/\[([^\]]+)\]/g, ':$1');
  
  // Handle index files
  if (route.endsWith('/index')) {
    route = route.replace(/\/index$/, '');
  }
  
  // Ensure route starts with /api
  route = `/api${route}`;
  
  return route;
}

/**
 * Load all API routes using simple, clean approach
 */
function loadAllRoutes() {
  console.log('🚀 Loading API routes...\n');
  
  // Find all .js files in api directory
  const apiFiles = glob.sync('api/**/*.js', {
    ignore: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js', '**/*.disabled']
  });
  
  let loadedCount = 0;
  let errorCount = 0;
  const errors = [];
  
  apiFiles.forEach(filePath => {
    try {
      const route = convertToExpressRoute(filePath);
      const fullPath = path.join(process.cwd(), filePath);
      
      // Clear require cache
      delete require.cache[require.resolve(fullPath)];
      
      // Load the handler
      const handler = require(fullPath);
      
      if (typeof handler === 'function') {
        // Wrap handler for error handling
        const wrappedHandler = async (req, res, next) => {
          try {
            // Convert Express params to query for compatibility
            if (req.params) {
              req.query = { ...req.query, ...req.params };
            }
            
            await handler(req, res);
          } catch (error) {
            console.error(`Error in ${route}:`, error.message);
            if (!res.headersSent) {
              res.status(500).json({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
              });
            }
          }
        };
        
        // Register route for all HTTP methods
        console.log(`🔧 Registering route: ${route}`);
        app.all(route, wrappedHandler);
        console.log(`✅ Loaded: ${route} <- ${filePath}`);
        loadedCount++;
      } else {
        console.log(`⚠️ Skipped (not a function): ${filePath}`);
      }
    } catch (error) {
      errorCount++;
      errors.push({ file: filePath, error: error.message });
      console.error(`❌ Failed to load ${filePath}: ${error.message}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`✨ Route Loading Complete`);
  console.log('='.repeat(50));
  console.log(`✅ Successfully loaded: ${loadedCount} routes`);
  console.log(`❌ Failed to load: ${errorCount} routes`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 5).forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }
  
  console.log('='.repeat(50) + '\n');
}

// Note: Error handling and 404 middleware moved to after route loading

// Initialize server
async function startServer() {
  try {
    // Initialize database connection
    const { checkConnection } = require('./lib/database');
    const isConnected = await checkConnection();
    
    if (!isConnected) {
      console.warn('⚠️ Database connection failed - continuing without database');
    } else {
      console.log('✅ Database connected');
    }

    // Register critical routes directly (before dynamic loading)
    console.log('🔧 Registering critical routes...');

    // Staff Login endpoint - ensure it works even if route loading fails
    app.post('/api/auth/staff-login', async (req, res) => {
      console.log('🔐 Direct staff-login route called!');
      try {
        const handler = require('./api/auth/staff-login.js');
        await handler(req, res);
      } catch (error) {
        console.error('Error in /api/auth/staff-login:', error.message);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Test endpoint to verify direct registration works
    app.get('/api/test-direct', (req, res) => {
      res.json({ message: 'Direct route registration works!', timestamp: new Date().toISOString() });
    });

    console.log('✅ Critical routes registered');

    // Load all routes
    console.log('🔧 About to load all routes...');
    loadAllRoutes();
    console.log('🔧 Finished loading all routes...');

    // Register error handling and 404 middleware AFTER routes are loaded
    console.log('🔧 Registering error handling middleware...');

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    });

    // 404 handler (must be last)
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method
      });
    });

    console.log('✅ Error handling middleware registered');

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 API available at http://localhost:${PORT}/api`);
      console.log(`💚 Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { shutdown } = require('./lib/database');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const { shutdown } = require('./lib/database');
  await shutdown();
  process.exit(0);
});

// Start the server
startServer();