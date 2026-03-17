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

-- Rivalry game history for cached rivalry score calculation
-- Team pairs stored canonically: team1_id < team2_id (alphabetically)
CREATE TABLE IF NOT EXISTS team_rivalry_games (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  team1_id    TEXT NOT NULL,
  team2_id    TEXT NOT NULL,
  game_date   TEXT NOT NULL,  -- YYYY-MM-DD
  season_type TEXT NOT NULL CHECK (season_type IN ('Playoffs', 'Regular Season')),
  point_diff  INTEGER NOT NULL,  -- home_score - away_score (can be negative)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rivalry_teams
  ON team_rivalry_games(team1_id, team2_id, game_date);