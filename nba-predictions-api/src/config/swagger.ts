import { Options } from 'swagger-jsdoc';

export const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NBA Game Predictions API',
      version: '1.0.0',
      description: 'REST API for NBA game predictions using machine learning',
      contact: {
        name: 'NBA Predictions API',
        url: 'https://github.com/ultcyber/nba_predictions'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api-test.nba-predictions.com/api/v1',
        description: 'Test server'
      },
      {
        url: 'https://api.nba-predictions.com/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Team: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique team identifier'
            },
            abbreviation: {
              type: 'string',
              description: 'Team abbreviation (3 characters)',
              example: 'LAL'
            },
            name: {
              type: 'string',
              description: 'Team name',
              example: 'Los Angeles Lakers'
            },
            conference: {
              type: 'string',
              enum: ['East', 'West'],
              description: 'Team conference'
            }
          },
          required: ['id', 'abbreviation', 'name', 'conference']
        },
        GamePrediction: {
          type: 'object',
          properties: {
            rating: {
              type: 'number',
              description: 'Predicted game rating score (0-100 scale)',
              minimum: 0,
              maximum: 100,
              example: 65.5
            },
            classification: {
              type: 'string',
              enum: ['good', 'bad'],
              description: 'Game classification based on configurable rating threshold'
            }
          },
          required: ['rating', 'classification']
        },
        Game: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique game identifier',
              example: '0022400741'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Game date in YYYY-MM-DD format',
              example: '2025-02-08'
            },
            home_team: {
              $ref: '#/components/schemas/Team'
            },
            away_team: {
              $ref: '#/components/schemas/Team'
            },
            prediction: {
              $ref: '#/components/schemas/GamePrediction'
            }
          },
          required: ['id', 'date', 'home_team', 'away_team', 'prediction']
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 150
            },
            page: {
              type: 'integer',
              description: 'Current page number',
              example: 1
            },
            per_page: {
              type: 'integer',
              description: 'Number of items per page',
              example: 20
            },
            total_pages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 8
            }
          },
          required: ['total', 'page', 'per_page', 'total_pages']
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'GAME_NOT_FOUND'
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'Game with ID \'0022400999\' not found'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details (optional)'
                }
              },
              required: ['code', 'message']
            }
          },
          required: ['success', 'error']
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};