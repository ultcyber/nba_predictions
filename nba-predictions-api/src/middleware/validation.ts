import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from './errorHandler';

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      const validationError: ApiError = new Error('Invalid query parameters');
      validationError.statusCode = 400;
      validationError.code = 'VALIDATION_ERROR';
      validationError.details = {
        field: error.details[0].path.join('.'),
        message: error.details[0].message,
        provided: error.details[0].context?.value
      };
      
      next(validationError);
      return;
    }
    
    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params);
    
    if (error) {
      const validationError: ApiError = new Error('Invalid path parameters');
      validationError.statusCode = 400;
      validationError.code = 'VALIDATION_ERROR';
      validationError.details = {
        field: error.details[0].path.join('.'),
        message: error.details[0].message,
        provided: error.details[0].context?.value
      };
      
      next(validationError);
      return;
    }
    
    req.params = value;
    next();
  };
};