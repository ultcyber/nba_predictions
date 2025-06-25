import { Router, Request, Response } from 'express';
import { database } from '@/config/database';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API and its dependencies
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     model_status:
 *                       type: string
 *                       enum: [active, inactive]
 *                     database_status:
 *                       type: string
 *                       enum: [connected, disconnected]
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    let databaseStatus = 'disconnected';
    try {
      await database.get('SELECT 1');
      databaseStatus = 'connected';
    } catch (error) {
      logger.warn('Database health check failed', { error: (error as Error).message });
    }

    // For now, model is always active (we'll integrate ML model later)
    const modelStatus = 'active';

    const overallStatus = databaseStatus === 'connected' && modelStatus === 'active' 
      ? 'healthy' 
      : 'unhealthy';

    res.json({
      success: true,
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        model_status: modelStatus,
        database_status: databaseStatus
      }
    });

  } catch (error) {
    logger.error('Health check error', { error: (error as Error).message });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed'
      }
    });
  }
});

export { router as healthRoutes };