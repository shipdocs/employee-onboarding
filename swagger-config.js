// Swagger configuration for Maritime Onboarding System API documentation

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Maritime Onboarding System API',
      version: '2.0.1',
      description: 'API documentation for the Maritime Onboarding System',
      contact: {
        name: 'Maritime Onboarding Support',
        email: 'support@maritime-onboarding.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://maritime-onboarding.com/api'
          : 'http://localhost:3000/api',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './api/**/*.js',
    './server.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
