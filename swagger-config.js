const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Maritime Onboarding System API',
      version: '1.0.0',
      description: 'REST API for Maritime Crew Onboarding and Management',
      contact: {
        name: 'Technical Support',
        email: 'support@maritime.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'API Server'
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
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./api/**/*.js'] // Path to the API routes
};

module.exports = swaggerJsdoc(options);
