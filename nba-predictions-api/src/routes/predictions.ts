import { Router, Request, Response, NextFunction } from 'express';
import { GameService } from '@/services/gameService';
import { validateQuery, validateParams } from '@/middleware/validation';
import { predictionsQuerySchema, gameIdParamsSchema } from '@/utils/validation';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();
const gameService = new GameService();

/**
 * @swagger
 * /predictions:
 *   get:
 *     summary: Get game predictions
 *     description: Returns a list of NBA games with predictions and probability scores
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filter games by date (YYYY-MM-DD format)
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *           minLength: 3
 *           maxLength: 3
 *         description: Filter games by team abbreviation (e.g., "LAL", "GSW")
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Successful response
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
 *                     games:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Game'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/', validateQuery(predictionsQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, team, limit, offset } = req.query as {
      date?: string;
      team?: string;
      limit: number;
      offset: number;
    };

    const filters = { date, team };
    const pagination = { limit, offset };

    const result = await gameService.getGames(filters, pagination);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /predictions/{game_id}:
 *   get:
 *     summary: Get single game prediction
 *     description: Returns detailed prediction for a specific game
 *     parameters:
 *       - in: path
 *         name: game_id
 *         required: true
 *         schema:
 *           type: string
 *         description: NBA game ID
 *     responses:
 *       200:
 *         description: Successful response
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
 *                     game:
 *                       $ref: '#/components/schemas/Game'
 *       404:
 *         description: Game not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:game_id', validateParams(gameIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { game_id } = req.params;

    const game = await gameService.getGameById(game_id);

    if (!game) {
      const notFoundError: ApiError = new Error(`Game with ID '${game_id}' not found`);
      notFoundError.statusCode = 404;
      notFoundError.code = 'GAME_NOT_FOUND';
      throw notFoundError;
    }

    res.json({
      success: true,
      data: { game }
    });

  } catch (error) {
    next(error);
  }
});

export { router as predictionRoutes };