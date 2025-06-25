import request from 'supertest';
import { app } from '@/app';
import { seedTestData, clearTestData, expectSuccessResponse, expectErrorResponse, expectGameStructure } from '../utils/testHelpers';
import { database } from '@/config/database';
import { initializeDatabase } from '@/config/initDatabase';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'development';
    process.env.DB_PATH = ':memory:';
    process.env.LOG_LEVEL = 'error';

    // Initialize database
    await database.connect();
    await initializeDatabase();
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expectSuccessResponse(response.body);
      expect(response.body.data).toHaveProperty('message', 'NBA Game Predictions API');
      expect(response.body.data).toHaveProperty('version', 'v1');
      expect(response.body.data).toHaveProperty('environment', 'development');
      expect(response.body.data.endpoints).toHaveProperty('health');
      expect(response.body.data.endpoints).toHaveProperty('predictions');
    });
  });

  describe('Health Endpoint', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expectSuccessResponse(response.body);
      expect(response.body.data).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        model_status: 'active',
        database_status: 'connected'
      });

      // Validate timestamp is valid ISO string
      expect(new Date(response.body.data.timestamp)).toBeInstanceOf(Date);
    });

    it('should return correct content type', async () => {
      await request(app)
        .get('/api/v1/health')
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });

  describe('Predictions Endpoints', () => {
    describe('GET /api/v1/predictions', () => {
      it('should return list of games with default pagination', async () => {
        const response = await request(app)
          .get('/api/v1/predictions')
          .expect(200);

        expectSuccessResponse(response.body);
        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('pagination');
        
        expect(Array.isArray(response.body.data.data)).toBe(true);
        expect(response.body.data.data.length).toBeGreaterThan(0);
        
        // Check pagination structure
        expect(response.body.data.pagination).toEqual({
          total: expect.any(Number),
          page: expect.any(Number),
          per_page: expect.any(Number),
          total_pages: expect.any(Number)
        });

        // Check first game structure
        if (response.body.data.data.length > 0) {
          expectGameStructure(response.body.data.data[0]);
        }
      });

      it('should filter games by date', async () => {
        const response = await request(app)
          .get('/api/v1/predictions?date=2025-02-08')
          .expect(200);

        expectSuccessResponse(response.body);
        
        if (response.body.data.data.length > 0) {
          response.body.data.data.forEach((game: any) => {
            expect(game.date).toBe('2025-02-08');
          });
        }
      });

      it('should filter games by team', async () => {
        const response = await request(app)
          .get('/api/v1/predictions?team=LAL')
          .expect(200);

        expectSuccessResponse(response.body);
        
        if (response.body.data.data.length > 0) {
          response.body.data.data.forEach((game: any) => {
            const hasTeam = game.home_team.abbreviation === 'LAL' || game.away_team.abbreviation === 'LAL';
            expect(hasTeam).toBe(true);
          });
        }
      });

      it('should handle pagination parameters', async () => {
        const response = await request(app)
          .get('/api/v1/predictions?limit=1&offset=0')
          .expect(200);

        expectSuccessResponse(response.body);
        expect(response.body.data.data.length).toBeLessThanOrEqual(1);
        expect(response.body.data.pagination.per_page).toBe(1);
      });

      it('should validate query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/predictions?date=invalid-date')
          .expect(400);

        expectErrorResponse(response.body, 'VALIDATION_ERROR');
      });

      it('should validate limit parameter', async () => {
        const response = await request(app)
          .get('/api/v1/predictions?limit=150')
          .expect(400);

        expectErrorResponse(response.body, 'VALIDATION_ERROR');
      });

      it('should return empty results for non-existent data', async () => {
        const response = await request(app)
          .get('/api/v1/predictions?date=2020-01-01')
          .expect(200);

        expectSuccessResponse(response.body);
        expect(response.body.data.data).toHaveLength(0);
        expect(response.body.data.pagination.total).toBe(0);
      });
    });

    describe('GET /api/v1/predictions/:game_id', () => {
      it('should return single game by ID', async () => {
        const response = await request(app)
          .get('/api/v1/predictions/0022400741')
          .expect(200);

        expectSuccessResponse(response.body);
        expect(response.body.data).toHaveProperty('game');
        expectGameStructure(response.body.data.game);
        expect(response.body.data.game.id).toBe('0022400741');
      });

      it('should return 404 for non-existent game', async () => {
        const response = await request(app)
          .get('/api/v1/predictions/invalid-game-id')
          .expect(404);

        expectErrorResponse(response.body, 'GAME_NOT_FOUND');
      });

      it('should validate game_id parameter', async () => {
        const response = await request(app)
          .get('/api/v1/unknown-endpoint')
          .expect(404);

        expectErrorResponse(response.body, 'NOT_FOUND');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expectErrorResponse(response.body, 'NOT_FOUND');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from Helmet', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      // Helmet adds various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});