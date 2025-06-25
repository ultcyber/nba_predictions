export interface Team {
  id: string;
  abbreviation: string;
  name: string;
  conference: 'East' | 'West';
}

export interface GamePrediction {
  rating: number;
  classification: 'good' | 'bad';
  probability: {
    good: number;
    bad: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

export interface Game {
  id: string;
  date: string;
  home_team: Team;
  away_team: Team;
  prediction: GamePrediction;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface GameFilters {
  date?: string | undefined;
  team?: string | undefined;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}