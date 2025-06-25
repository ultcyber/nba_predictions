import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { healthRoutes } from '@/routes/health';
import { predictionRoutes } from '@/routes/predictions';
import { swaggerOptions } from '@/config/swagger';
import { database } from '@/config/database';
import { initializeDatabase } from '@/config/initDatabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  }
});

// CORS configuration for different environments
const getCorsOrigins = (): string[] | boolean => {
  const { NODE_ENV, CORS_ORIGINS } = process.env;
  
  // If CORS_ORIGINS is explicitly set, use it
  if (CORS_ORIGINS) {
    return CORS_ORIGINS.split(',').map(origin => origin.trim());
  }
  
  // Environment-based defaults
  switch (NODE_ENV) {
    case 'production':
      return ['https://nba-predictions.com'];
    case 'test':
      return ['https://test.nba-predictions.com'];
    default: // development
      // In development, allow any localhost origin
      return true;
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Swagger documentation
const specs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// API Routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/health`, healthRoutes);
app.use(`/api/${apiVersion}/predictions`, predictionRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: 'NBA Game Predictions API',
      version: apiVersion,
      environment: process.env.NODE_ENV || 'development',
      documentation: `/api-docs`,
      endpoints: {
        health: `/api/${apiVersion}/health`,
        predictions: `/api/${apiVersion}/predictions`
      }
    }
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

async function startServer(): Promise<void> {
  try {
    // Initialize database
    await database.connect();
    await initializeDatabase();
    
    app.listen(PORT, () => {
      const corsOrigins = getCorsOrigins();
      logger.info(`🚀 NBA Predictions API running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔒 CORS: ${corsOrigins === true ? 'Allow all localhost' : `Origins: ${Array.isArray(corsOrigins) ? corsOrigins.join(', ') : corsOrigins}`}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/api/${apiVersion}/health`);
    });
    
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

startServer();