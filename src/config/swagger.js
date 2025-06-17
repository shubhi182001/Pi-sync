const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PiSync Backend API',
      version: '1.0.0',
      description: 'API for PiSync event processing system',
      contact: {
        name: 'PiSync Team',
        email: 'support@pisync.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        SyncEvent: {
          type: 'object',
          required: ['device_id', 'timestamp', 'total_files_synced', 'total_errors'],
          properties: {
            device_id: {
              type: 'string',
              description: 'Unique identifier for the device',
              example: 'PI-DEVICE-001'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'When the sync event occurred',
              example: '2024-01-15T10:30:00Z'
            },
            total_files_synced: {
              type: 'integer',
              minimum: 0,
              description: 'Number of files successfully synced',
              example: 25
            },
            total_errors: {
              type: 'integer',
              minimum: 0,
              description: 'Number of errors during sync',
              example: 2
            },
            internet_speed: {
              type: 'number',
              minimum: 0,
              description: 'Internet speed in Mbps',
              example: 15.5
            }
          }
        },
        Device: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Unique identifier for the device'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'When the device was first registered'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'When the device was last seen'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field that caused the error'
                  },
                  message: {
                    type: 'string',
                    description: 'Error message for the field'
                  },
                  value: {
                    description: 'Value that caused the error'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'], 
};

const specs = swaggerJSDoc(options);

const swaggerSetup = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customSiteTitle: 'PiSync API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6 }
    `
  }));
};

module.exports = { swaggerSetup, specs };