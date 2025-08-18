import { createRequire } from 'module';
import path from 'path';
import { validateApiPath } from '../../lib/security/pathSecurity.js';

const require = createRequire(import.meta.url);

export default async function handler(req, res) {
  const { slug } = req.query;
  const apiPath = Array.isArray(slug) ? slug.join('/') : slug;

  try {
    // Validate API path for security
    const pathValidation = validateApiPath(apiPath);
    if (!pathValidation.isValid) {
      console.error(`Invalid API path attempted: ${apiPath} - ${pathValidation.error}`);
      return res.status(400).json({ error: 'Invalid API path' });
    }

    // Use the sanitized path
    const sanitizedApiPath = pathValidation.sanitizedPath;

    // Construct the path to the API file in the /api directory
    const apiFilePath = path.join(process.cwd(), 'api', `${sanitizedApiPath}.js`);
    
    // Try to require the API handler
    let apiHandler;
    try {
      // Clear the require cache to ensure fresh imports during development
      delete require.cache[require.resolve(apiFilePath)];
      apiHandler = require(apiFilePath);
    } catch (error) {
      // If .js file doesn't exist, try .ts
      const apiFilePathTs = path.join(process.cwd(), 'api', `${sanitizedApiPath}.ts`);
      try {
        delete require.cache[require.resolve(apiFilePathTs)];
        apiHandler = require(apiFilePathTs);
      } catch (tsError) {
        console.error(`API file not found: ${sanitizedApiPath}`, error.message);
        return res.status(404).json({ error: 'API endpoint not found' });
      }
    }
    
    // Call the API handler
    if (typeof apiHandler === 'function') {
      return await apiHandler(req, res);
    } else if (apiHandler.default && typeof apiHandler.default === 'function') {
      return await apiHandler.default(req, res);
    } else {
      console.error(`Invalid API handler for: ${sanitizedApiPath}`);
      return res.status(500).json({ error: 'Invalid API handler' });
    }
  } catch (error) {
    console.error(`Error handling API request for ${sanitizedApiPath}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
