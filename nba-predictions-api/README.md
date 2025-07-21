# NBA Predictions API

REST API for NBA game predictions using machine learning models.

## Features

- **Game Predictions**: Get predictions for NBA games with ratings and probabilities
- **Filtering**: Filter games by date and team
- **Pagination**: Efficient pagination for large datasets
- **Validation**: Request validation with detailed error messages
- **Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Logging**: Structured logging with Winston
- **Health Checks**: Database and service health monitoring
- **Security**: CORS, rate limiting, and security headers

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Development

```bash
npm run dev
```

### Build & Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /api/v1/health` - Service health status

### Game Predictions
- `GET /api/v1/predictions` - List games with predictions
- `GET /api/v1/predictions/{game_id}` - Single game prediction

### Documentation
- `GET /api-docs` - Swagger UI documentation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `DB_PATH` | SQLite database path | `./data/nba_predictions.db` |
| `API_VERSION` | API version | `v1` |
| `CORS_ORIGINS` | Allowed CORS origins | Environment-based |
| `LOG_LEVEL` | Logging level | `info` |

## Database Schema

### Teams Table
- `id` - Unique team identifier
- `abbreviation` - 3-letter team code (e.g., "LAL")
- `name` - Full team name
- `city` - Team city
- `conference` - "East" or "West"

### Games Table
- `id` - Unique game identifier
- `date` - Game date (YYYY-MM-DD)
- `home_team_id` / `away_team_id` - Team references
- `prediction_rating` - ML model rating score
- `prediction_classification` - "good" or "bad"
- `probability_good` / `probability_bad` - Prediction probabilities
- `confidence` - "high", "medium", or "low"

## Database Commands

```bash
# Initialize database with schema and sample data (development)
npm run db:init

# Initialize database schema only (production)
npm run db:schema
```

## Development Commands

```bash
# Development with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Build
npm run build

# Production
npm start
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

## Environment-Specific Configuration

### Development
- Allows all localhost CORS origins
- Console logging enabled
- Debug information in error responses

### Test
- Specific test domain CORS
- File logging only

### Production
- Production domain CORS only
- Minimal error information
- Performance optimizations

## Integration with ML Model

The API is designed to integrate with the NBA predictions ML model located in `../nba-predictions-model/`. Game data will be processed through the trained XGBoost pipeline to generate predictions and probability scores.

Ready for Phase 1 backend development completion!