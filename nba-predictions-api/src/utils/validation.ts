import Joi from 'joi';

export const predictionsQuerySchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
    .messages({ 'string.pattern.base': 'Date must be in YYYY-MM-DD format' }),
  
  team: Joi.string().length(3).uppercase().optional()
    .messages({ 'string.length': 'Team abbreviation must be exactly 3 characters' }),
  
  limit: Joi.number().integer().min(1).max(100).default(20),
  
  offset: Joi.number().integer().min(0).default(0)
});

export const gameIdParamsSchema = Joi.object({
  game_id: Joi.string().required()
    .messages({ 'any.required': 'Game ID is required' })
});