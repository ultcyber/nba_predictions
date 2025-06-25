import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { healthRoutes } from '@/routes/health';
import { predictionRoutes } from '@/routes/predictions';
import { swaggerOptions } from '@/config/swagger';

dotenv.config();

const app = express();

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

export { app };