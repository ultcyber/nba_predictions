# NBA Game Predictions API Specification

This directory contains the complete API specification for the NBA Game Predictions system, fulfilling Phase 1 Task 1 requirements.

## Files Overview

### 1. `api-endpoints.md`
Complete REST API specification including:
- **GET /predictions** - List finished games with predictions
- **GET /predictions/{game_id}** - Single game prediction details  
- **GET /health** - API health status
- Request/response formats with JSON examples
- Error handling documentation
- Query parameters and filtering options

### 2. `types.ts` 
TypeScript interfaces for all API responses:
- `Game` - Game data with teams and predictions
- `Team` - Team information (name, abbreviation, conference)
- `GamePrediction` - Rating, classification, and probabilities
- `ApiResponse<T>` - Standard response wrapper
- `ApiError` - Error response format
- Query parameter types and response unions

## Key API Features

**Game Data Structure:**
- Game ID, date, home/away teams
- ML model prediction rating (continuous score)
- Binary classification (good/bad based on ≥60 threshold)
- Probability scores for both classifications
- Confidence levels (high/medium/low)

**Data Focus:**
- Only finished NBA games (no scheduled predictions)
- Team info includes conference but excludes win/loss records
- Simplified feature set (no detailed model features exposed)

**API Standards:**
- RESTful endpoints with consistent JSON responses
- Pagination support for game lists
- Date filtering (YYYY-MM-DD format)
- Team filtering by abbreviation
- Proper HTTP status codes and error handling

## Usage for Development

Import TypeScript types:
```typescript
import { Game, GamePrediction, GetPredictionsResponse } from './types';
```

The specification serves as the contract between frontend and backend development teams, ensuring consistent data structures and API behavior throughout the application.