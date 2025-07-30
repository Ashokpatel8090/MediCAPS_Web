import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Admin Management API',
      version: '1.0.0',
      description: 'API for managing users by Admins',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        UserStatusResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'User account deactivated successfully',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Access Denied: Admin privileges required',
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/controllers/**/*.js', './src/routes/**/*.js'], // Path to route files with Swagger JSDoc comments
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
