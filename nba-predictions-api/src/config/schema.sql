-- NBA Predictions Database Schema

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  abbreviation TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  conference TEXT NOT NULL CHECK (conference IN ('East', 'West'))
);

-- Games table with predictions
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  prediction_rating REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (home_team_id) REFERENCES teams (id),
  FOREIGN KEY (away_team_id) REFERENCES teams (id)
);

-- Essential indexes for query performance
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);