import { GameService } from '@/services/gameService';
import { setupTestDatabase, seedTestData, clearTestData, mockTeams, mockGames } from '../utils/testHelpers';

describe('GameService', () => {
  let gameService: GameService;

  beforeAll(async () => {
    // Set up test environment with in-memory database
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = ':memory:';
    process.env.LOG_LEVEL = 'error';
    
    await setupTestDatabase();
    gameService = new GameService();
  });

  beforeEach(async () => {
    await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('getGames', () => {
    it('should return all games with default pagination', async () => {
      const result = await gameService.getGames({}, { limit: 20, offset: 0 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        per_page: 20,
        total_pages: 1
      });

      // Verify game structure
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('home_team');
      expect(result.data[0]).toHaveProperty('away_team');
      expect(result.data[0]).toHaveProperty('prediction');
    });

    it('should filter games by date', async () => {
      const result = await gameService.getGames(
        { date: '2025-02-08' }, 
        { limit: 20, offset: 0 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].date).toBe('2025-02-08');
      expect(result.data[0].id).toBe(mockGames[0].id);
    });

    it('should filter games by team abbreviation', async () => {
      const result = await gameService.getGames(
        { team: 'LAL' }, 
        { limit: 20, offset: 0 }
      );

      expect(result.data).toHaveLength(1);
      expect(
        result.data[0].home_team.abbreviation === 'LAL' || 
        result.data[0].away_team.abbreviation === 'LAL'
      ).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const result = await gameService.getGames({}, { limit: 1, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        per_page: 1,
        total_pages: 2
      });
    });

    it('should return empty results for non-existent date', async () => {
      const result = await gameService.getGames(
        { date: '2025-01-01' }, 
        { limit: 20, offset: 0 }
      );

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should return empty results for non-existent team', async () => {
      const result = await gameService.getGames(
        { team: 'XYZ' }, 
        { limit: 20, offset: 0 }
      );

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle combined filters', async () => {
      const result = await gameService.getGames(
        { date: '2025-02-08', team: 'LAL' }, 
        { limit: 20, offset: 0 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].date).toBe('2025-02-08');
      expect(
        result.data[0].home_team.abbreviation === 'LAL' || 
        result.data[0].away_team.abbreviation === 'LAL'
      ).toBe(true);
    });
  });

  describe('getGameById', () => {
    it('should return game by valid ID', async () => {
      const game = await gameService.getGameById(mockGames[0].id);

      expect(game).not.toBeNull();
      expect(game?.id).toBe(mockGames[0].id);
      expect(game?.date).toBe(mockGames[0].date);
      expect(game?.prediction.rating).toBe(mockGames[0].prediction.rating);
      expect(game?.prediction.classification).toBe(mockGames[0].prediction.classification);
    });

    it('should return null for invalid ID', async () => {
      const game = await gameService.getGameById('invalid-id');
      expect(game).toBeNull();
    });

    it('should include complete team information', async () => {
      const game = await gameService.getGameById(mockGames[0].id);

      expect(game?.home_team).toEqual(mockTeams[0]);
      expect(game?.away_team).toEqual(mockTeams[1]);
    });

    it('should include complete prediction information', async () => {
      const game = await gameService.getGameById(mockGames[0].id);

      expect(game?.prediction).toEqual(mockGames[0].prediction);
    });
  });

  describe('mapRowToGame', () => {
    it('should correctly map database row to Game object', async () => {
      // This tests the private method indirectly through getGameById
      const game = await gameService.getGameById(mockGames[0].id);

      expect(game).toMatchObject({
        id: mockGames[0].id,
        date: mockGames[0].date,
        home_team: {
          id: mockTeams[0].id,
          abbreviation: mockTeams[0].abbreviation,
          name: mockTeams[0].name,
          conference: mockTeams[0].conference
        },
        away_team: {
          id: mockTeams[1].id,
          abbreviation: mockTeams[1].abbreviation,
          name: mockTeams[1].name,
          conference: mockTeams[1].conference
        },
        prediction: mockGames[0].prediction
      });
    });
  });
});