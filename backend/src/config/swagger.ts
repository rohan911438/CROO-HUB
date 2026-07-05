import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CROO Hub API',
      version: '0.1.0',
      description:
        'REST API for CROO Hub — the intelligent operating system for the AI Agent Economy. ' +
        'Endpoints for agent discovery, evaluation, orchestration, reputation and (future) on-chain settlement.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/docs/*.yaml'],
});
