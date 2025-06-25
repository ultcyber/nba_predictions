import { Request, Response, NextFunction } from 'express';
import { validateQuery, validateParams } from '@/middleware/validation';
import { predictionsQuerySchema, gameIdParamsSchema } from '@/utils/validation';

// Mock Express objects
const mockRequest = (query = {}, params = {}): Partial<Request> => ({
  query,
  params
});

const mockResponse = (): Partial<Response> => ({});

const mockNext = jest.fn() as NextFunction;

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateQuery', () => {
    const validatePredictionsQuery = validateQuery(predictionsQuerySchema);

    it('should pass valid query parameters', () => {
      const req = mockRequest({
        date: '2025-02-08',
        team: 'LAL',
        limit: '20',
        offset: '0'
      }) as Request;
      const res = mockResponse() as Response;

      validatePredictionsQuery(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Check that values are properly converted
      expect(req.query.limit).toBe(20);
      expect(req.query.offset).toBe(0);
    });

    it('should apply default values for missing optional parameters', () => {
      const req = mockRequest({}) as Request;
      const res = mockResponse() as Response;

      validatePredictionsQuery(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.query.limit).toBe(20);
      expect(req.query.offset).toBe(0);
    });

    it('should reject invalid date format', () => {
      const req = mockRequest({ date: '2025/02/08' }) as Request;
      const res = mockResponse() as Response;

      validatePredictionsQuery(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid query parameters',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: expect.objectContaining({
            field: 'date',
            message: 'Date must be in YYYY-MM-DD format'
          })
        })
      );
    });

    it('should reject invalid team abbreviation length', () => {
      const req = mockRequest({ team: 'LAKERS' }) as Request;
      const res = mockResponse() as Response;

      validatePredictionsQuery(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid query parameters',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: expect.objectContaining({
            field: 'team',
            message: 'Team abbreviation must be exactly 3 characters'
          })
        })
      );
    });

    it('should reject limit exceeding maximum', () => {
      const req = mockRequest({ limit: '150' }) as Request;
      const res = mockResponse() as Response;

      validatePredictionsQuery(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid query parameters',
          statusCode: 400,
          code: 'VALIDATION_ERROR'
        })
      );
    });

    it('should reject negative offset', () => {
      const req = mockRequest({ offset: '-1' }) as Request;
      const res = mockResponse() as Response;

      validatePredictionsQuery(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid query parameters',
          statusCode: 400,
          code: 'VALIDATION_ERROR'
        })
      );
    });

    it('should convert team abbreviation to uppercase', () => {
      const req = mockRequest({ team: 'lal' }) as Request;
      const res = mockResponse() as Response;

      validatePredictionsQuery(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.query.team).toBe('LAL');
    });
  });

  describe('validateParams', () => {
    const validateGameIdParams = validateParams(gameIdParamsSchema);

    it('should pass valid game ID parameter', () => {
      const req = mockRequest({}, { game_id: '0022400741' }) as Request;
      const res = mockResponse() as Response;

      validateGameIdParams(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should reject missing game ID parameter', () => {
      const req = mockRequest({}, {}) as Request;
      const res = mockResponse() as Response;

      validateGameIdParams(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid path parameters',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: expect.objectContaining({
            field: 'game_id',
            message: 'Game ID is required'
          })
        })
      );
    });

    it('should pass any string as game ID', () => {
      const req = mockRequest({}, { game_id: 'any-string-value' }) as Request;
      const res = mockResponse() as Response;

      validateGameIdParams(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.params.game_id).toBe('any-string-value');
    });
  });
});