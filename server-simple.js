// Maritime Onboarding System - Simple Express Server
// Simplified server to avoid path-to-regexp issues

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:80'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve documentation from doxygen-docs/html directory
app.use('/docs', express.static(path.join(__dirname, 'doxygen-docs/html'), {
  index: 'index.html',
  setHeaders: (res, path) => {
    // Set proper MIME types for CSS and JS files
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    // Enable caching for static documentation assets
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple API route loader - avoiding dynamic routes for now
function loadSimpleApiRoutes(dir, basePath = '') {
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  API directory not found: ${dir}`);
    return;
  }

  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    // Skip files/dirs with brackets (dynamic routes) for now
    if (item.includes('[') || item.includes(']')) {
      console.log(`⏭️  Skipping dynamic route: ${item}`);
      return;
    }

    if (stat.isDirectory()) {
      // Recursively load subdirectories
      loadSimpleApiRoutes(itemPath, `${basePath}/${item}`);
    } else if (item.endsWith('.js')) {
      const routeName = item === 'index.js' ? '' : `/${item.replace('.js', '')}`;
      const routePath = `${basePath}${routeName}`;

      try {
        delete require.cache[require.resolve(itemPath)];
        const handler = require(itemPath);

        if (typeof handler === 'function') {
          const expressHandler = async (req, res, next) => {
            try {
              await handler(req, res);
            } catch (error) {
              console.error(`Error in ${routePath}:`, error);
              res.status(500).json({ error: 'Internal server error' });
            }
          };

          app.all(routePath, expressHandler);
          console.log(`✅ Loaded API route: ${routePath}`);
        }
      } catch (error) {
        console.log(`⚠️  Failed to load ${itemPath}: ${error.message}`);
      }
    }
  });
}

// Load API routes
const apiDir = path.join(__dirname, 'api');
loadSimpleApiRoutes(apiDir, '/api');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚢 Maritime Onboarding System Server (Simplified)
📍 Running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
⚡ Ready to handle requests!
  `);
});
