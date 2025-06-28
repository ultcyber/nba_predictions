# NBA Game Predictions API Specification

## Overview
This API provides NBA game predictions with ratings based on machine learning model analysis. The API returns game information, team details, and prediction ratings with computed classifications for finished NBA games.

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication
Currently no authentication required for development phase.

## Endpoints

### 1. Get Game Predictions
**Endpoint:** `GET /predictions`

**Description:** Returns a list of finished NBA games with prediction ratings and computed classifications.

**Query Parameters:**
- `date` (optional): Filter games by date (YYYY-MM-DD format)
- `team` (optional): Filter games by team abbreviation (e.g., "LAL", "GSW")
- `limit` (optional): Limit number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "id": "0022400741",
        "date": "2025-02-08",
        "home_team": {
          "id": "1610612742",
          "abbreviation": "DAL",
          "name": "Dallas Mavericks",
          "city": "Dallas",
          "conference": "West"
        },
        "away_team": {
          "id": "1610612745",
          "abbreviation": "HOU",
          "name": "Houston Rockets",
          "city": "Houston",
          "conference": "West"
        },
        "prediction": {
          "rating": 65.5,
          "classification": "good"
        }
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "per_page": 20,
      "total_pages": 8
    }
  }
}
```

### 2. Get Single Game Prediction
**Endpoint:** `GET /predictions/{game_id}`

**Description:** Returns detailed prediction for a specific finished game.

**Path Parameters:**
- `game_id`: NBA game ID (e.g., "0022400741")

**Response Format:**
```json
{
  "success": true,
  "data": {
    "game": {
      "id": "0022400741",
      "date": "2025-02-08",
      "home_team": {
        "id": "1610612742",
        "abbreviation": "DAL",
        "name": "Dallas Mavericks",
        "city": "Dallas",
        "conference": "West"
      },
      "away_team": {
        "id": "1610612745",
        "abbreviation": "HOU",
        "name": "Houston Rockets",
        "city": "Houston",
        "conference": "West"
      },
      "prediction": {
        "rating": 65.5,
        "classification": "good"
      }
    }
  }
}
```

### 3. Health Check
**Endpoint:** `GET /health`

**Description:** Returns API health status.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-02-08T15:30:00Z",
    "model_status": "active",
    "database_status": "connected"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid date format. Expected: YYYY-MM-DD",
    "details": {
      "field": "date",
      "provided": "2025/02/08",
      "expected": "2025-02-08"
    }
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "GAME_NOT_FOUND",
    "message": "Game with ID '0022400999' not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "request_id": "req_12345"
  }
}
```

## Rating Classification

The model outputs a continuous rating score which is classified as:
- **Good**: Rating ≥ 60 (High entertainment value expected)
- **Bad**: Rating < 60 (Lower entertainment value expected)

## Rating and Classification

Ratings and classifications are determined by the machine learning model:
- Rating: Numeric score from 0 to 100 representing game quality
- Classification: Computed from rating using configurable threshold (default: 60)
  - "good": Rating is at or above the threshold
  - "bad": Rating is below the threshold