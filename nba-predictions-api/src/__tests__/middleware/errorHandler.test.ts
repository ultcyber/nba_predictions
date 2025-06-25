import { Request, Response, NextFunction } from 'express';
import { errorHandler, ApiError } from '@/middleware/errorHandler';

// Mock Express objects
const mockRequest = (): Partial<Request> => ({
  url: '/api/v1/test',
  method: 'GET',
  ip: '127.0.0.1',
  get: jest.fn().mockReturnValue('test-user-agent')
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV for each test
    delete process.env.NODE_ENV;
  });

  it('should handle ApiError with custom status code and details', () => {
    const error: ApiError = new Error('Custom error message');
    error.statusCode = 404;
    error.code = 'RESOURCE_NOT_FOUND';
    error.details = { resourceId: '123' };

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Custom error message',
        details: { resourceId: '123' }
      }
    });
  });

  it('should use default values for standard Error', () => {
    const error = new Error('Standard error');
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Standard error'
      }
    });
  });

  it('should include stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Development error');
    error.stack = 'Error stack trace';
    
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandler(error, req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Development error',
        stack: 'Error stack trace'
      }
    });
  });

  it('should not include stack trace in production environment', () => {
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Production error');
    error.stack = 'Error stack trace';
    
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandler(error, req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Production error'
      }
    });
  });

  it('should not include details when not provided', () => {
    const error: ApiError = new Error('Simple error');
    error.statusCode = 400;
    error.code = 'BAD_REQUEST';

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandler(error, req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Simple error'
      }
    });
  });

  it('should log error with request context', () => {
    const error = new Error('Logged error');
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    // Import logger after mocking
    const { logger } = require('@/utils/logger');

    errorHandler(error, req, res, mockNext);

    expect(logger.error).toHaveBeenCalledWith('API Error', {
      error: 'Logged error',
      stack: error.stack,
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      url: '/api/v1/test',
      method: 'GET',
      ip: '127.0.0.1',
      userAgent: 'test-user-agent'
    });
  });

  it('should handle errors with undefined properties gracefully', () => {
    const error: ApiError = new Error('Undefined properties error');
    // Don't set optional properties to test default behavior

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Undefined properties error'
      }
    });
  });
});