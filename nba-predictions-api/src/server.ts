import { app } from './app';
import { logger } from '@/utils/logger';
import { database } from '@/config/database';
import { initializeDatabase } from '@/config/initDatabase';

const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  try {
    // Initialize database
    await database.connect();
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info(`🚀 NBA Predictions API running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/api/v1/health`);
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