require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const logger = require('./config/logger');
const { swaggerSetup } = require('./config/swagger');
const syncRoutes = require('./routes/index');
const { globalErrorHandler, handleNotFound } = require('./middleware/errorHandler');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;


// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Swagger UI
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // 100 requests per IP per minute
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);


// CORS configuration
const corsOptions = {
  origin: ['*', 'http://localhost:3000'], // Allow all origins in development, restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});


// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// API routes
app.use('/api', syncRoutes);

// Swagger documentation
swaggerSetup(app);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to PiSync Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      'POST /api/sync-event': 'Create a new sync event',
      'GET /api/device/:id/sync-history': 'Get sync history for a device',
      'GET /api/devices/repeated-failures': 'Get devices with repeated failures',
      'GET /api/stats': 'Get system statistics'
    }
  });
});


app.get('/health', (req, res) => {
  console.log('Health check hit!');
  res.json({
    status: 'OK',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});



// Handle 404 routes
app.use(handleNotFound);

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    
    // Close database connections
    const db = require('./config/database');
    db.close().then(() => {
      logger.info('Database connections closed');
      process.exit(0);
    }).catch((error) => {
      logger.error('Error closing database connections:', error);
      process.exit(1);
    });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};


// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`PiSync Backend running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app;