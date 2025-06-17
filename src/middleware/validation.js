const Joi = require('joi');
const logger = require('../config/logger');

const syncEventSchema = Joi.object({
  device_id: Joi.string().min(1).max(255).required(),
  timestamp: Joi.date().iso().required(),
  total_files_synced: Joi.number().integer().min(0).required(),
  total_errors: Joi.number().integer().min(0).required(),
  internet_speed: Joi.number().allow(null).optional()
});

const deviceIdSchema = Joi.object({
  id: Joi.string().min(1).max(255).required()
});

const queryParamsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).default(50),
  offset: Joi.number().integer().min(0).default(0),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

const repeatedFailuresSchema = Joi.object({
  threshold: Joi.number().integer().min(1).max(100).default(3)
});

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    let dataToValidate;
    
    switch (source) {
      case 'body':
        dataToValidate = req.body;
        break;
      case 'params':
        dataToValidate = req.params;
        break;
      case 'query':
        dataToValidate = req.query;
        break;
      default:
        dataToValidate = req.body;
    }

    const { error, value } = schema.validate(dataToValidate, { 
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      logger.warn('Validation error:', { 
        path: req.path,
        method: req.method,
        errors: errorDetails
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorDetails
      });
    }

    switch (source) {
      case 'body':
        req.body = value;
        break;
      case 'params':
        req.params = value;
        break;
      case 'query':
        req.query = value;
        break;
    }

    next();
  };
};

const validateTimestamp = (req, res, next) => {
  const { timestamp } = req.body;
  const now = new Date();
  const eventTime = new Date(timestamp);

  if (eventTime > now) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: [{
        field: 'timestamp',
        message: 'Timestamp cannot be in the future',
        value: timestamp
      }]
    });
  }

  next();
};

module.exports = {
  validateSyncEvent: [
    validate(syncEventSchema, 'body'),
    validateTimestamp
  ],
  validateDeviceId: validate(deviceIdSchema, 'params'),
  validateQueryParams: validate(queryParamsSchema, 'query'),
  validateRepeatedFailures: validate(repeatedFailuresSchema, 'query')
};