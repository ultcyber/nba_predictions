import { predictionsQuerySchema, gameIdParamsSchema } from '@/utils/validation';

describe('Validation Schemas', () => {
  describe('predictionsQuerySchema', () => {
    it('should validate correct query parameters', () => {
      const validQuery = {
        date: '2025-02-08',
        team: 'LAL',
        limit: 20,
        offset: 0
      };

      const { error, value } = predictionsQuerySchema.validate(validQuery);

      expect(error).toBeUndefined();
      expect(value).toEqual(validQuery);
    });

    it('should apply default values for missing parameters', () => {
      const { error, value } = predictionsQuerySchema.validate({});

      expect(error).toBeUndefined();
      expect(value).toEqual({
        limit: 20,
        offset: 0
      });
    });

    it('should convert string numbers to integers', () => {
      const query = {
        limit: '25',
        offset: '10'
      };

      const { error, value } = predictionsQuerySchema.validate(query);

      expect(error).toBeUndefined();
      expect(value.limit).toBe(25);
      expect(value.offset).toBe(10);
    });

    it('should convert team abbreviation to uppercase', () => {
      const query = { team: 'lal' };

      const { error, value } = predictionsQuerySchema.validate(query);

      expect(error).toBeUndefined();
      expect(value.team).toBe('LAL');
    });

    it('should reject invalid date format', () => {
      const query = { date: '2025/02/08' };

      const { error } = predictionsQuerySchema.validate(query);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe('Date must be in YYYY-MM-DD format');
    });

    it('should reject team abbreviation with wrong length', () => {
      const query = { team: 'LAKERS' };

      const { error } = predictionsQuerySchema.validate(query);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe('Team abbreviation must be exactly 3 characters');
    });

    it('should reject limit above maximum', () => {
      const query = { limit: 150 };

      const { error } = predictionsQuerySchema.validate(query);

      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['limit']);
    });

    it('should reject negative limit', () => {
      const query = { limit: -1 };

      const { error } = predictionsQuerySchema.validate(query);

      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['limit']);
    });

    it('should reject negative offset', () => {
      const query = { offset: -1 };

      const { error } = predictionsQuerySchema.validate(query);

      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['offset']);
    });

    it('should accept valid date formats', () => {
      const validDates = ['2025-01-01', '2025-12-31', '2024-02-29'];

      validDates.forEach(date => {
        const { error } = predictionsQuerySchema.validate({ date });
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid date formats', () => {
      const invalidDates = ['25-01-01', '2025-1-1', '2025/01/01', 'invalid-date'];

      invalidDates.forEach(date => {
        const { error } = predictionsQuerySchema.validate({ date });
        expect(error).toBeDefined();
      });
    });

    it('should handle edge cases for limit', () => {
      // Test minimum valid limit
      const { error: error1 } = predictionsQuerySchema.validate({ limit: 1 });
      expect(error1).toBeUndefined();

      // Test maximum valid limit
      const { error: error2 } = predictionsQuerySchema.validate({ limit: 100 });
      expect(error2).toBeUndefined();

      // Test zero (invalid)
      const { error: error3 } = predictionsQuerySchema.validate({ limit: 0 });
      expect(error3).toBeDefined();
    });
  });

  describe('gameIdParamsSchema', () => {
    it('should validate required game_id parameter', () => {
      const params = { game_id: '0022400741' };

      const { error, value } = gameIdParamsSchema.validate(params);

      expect(error).toBeUndefined();
      expect(value).toEqual(params);
    });

    it('should reject missing game_id parameter', () => {
      const { error } = gameIdParamsSchema.validate({});

      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe('Game ID is required');
    });

    it('should accept any string as game_id', () => {
      const validIds = ['0022400741', 'game-123', 'test_id', '12345'];

      validIds.forEach(game_id => {
        const { error } = gameIdParamsSchema.validate({ game_id });
        expect(error).toBeUndefined();
      });
    });

    it('should reject empty string game_id', () => {
      const { error } = gameIdParamsSchema.validate({ game_id: '' });

      expect(error).toBeDefined();
    });

    it('should reject null or undefined game_id', () => {
      const { error: error1 } = gameIdParamsSchema.validate({ game_id: null });
      expect(error1).toBeDefined();

      const { error: error2 } = gameIdParamsSchema.validate({ game_id: undefined });
      expect(error2).toBeDefined();
    });
  });
});