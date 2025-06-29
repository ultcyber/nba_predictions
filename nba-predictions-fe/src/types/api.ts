// TypeScript interfaces for NBA Game Predictions API

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    request_id?: string;
  };
}

export interface Team {
  id: string;
  abbreviation: string;
  name: string;
  conference: 'East' | 'West';
}

export interface GamePrediction {
  rating: number;
  classification: 'good' | 'mediocre' | 'bad';
}

export interface Game {
  id: string;
  date: string; // YYYY-MM-DD format
  home_team: Team;
  away_team: Team;
  prediction: GamePrediction;
}

export interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface GamesResponse {
  data: Game[];
  pagination: Pagination;
}

export interface SingleGameResponse {
  game: Game;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string; // ISO 8601 format
  model_status: 'active' | 'inactive';
  database_status: 'connected' | 'disconnected';
}

// API Query Parameters
export interface PredictionsQueryParams {
  date?: string; // YYYY-MM-DD format
  team?: string; // Team abbreviation
  limit?: number; // Default: 20, Max: 100
  offset?: number; // Default: 0
}

// API Response Types
export type GetPredictionsResponse = ApiResponse<GamesResponse> | ApiError;
export type GetSinglePredictionResponse = ApiResponse<SingleGameResponse> | ApiError;
export type GetHealthResponse = ApiResponse<HealthStatus> | ApiError;