# Phase 3: Scheduled Predictions System

## Overview
Create an automated system to collect NBA game data, generate predictions using the trained XGBoost model, and store results in the database for frontend consumption.

## Project Structure
```
nba-predictions-scheduled-job/
├── src/
│   ├── data_collector.py       # NBA API data collection
│   ├── feature_engineer.py     # Feature extraction matching training
│   ├── predictor.py           # Model loading and prediction
│   ├── database_manager.py    # SQLite operations
│   ├── main.py               # Main orchestration script
│   └── utils/
│       ├── logger.py         # Logging configuration
│       ├── config.py        # Configuration management
│       └── exceptions.py    # Custom exceptions
├── config/
│   ├── config.yaml          # Configuration file
│   └── logging.yaml         # Logging configuration
├── requirements.txt         # Python dependencies
├── README.md               # Documentation
├── .env.example           # Environment variables template
└── tests/                 # Unit tests
    ├── test_data_collector.py
    ├── test_feature_engineer.py
    ├── test_predictor.py
    └── test_database_manager.py
```

## Detailed Implementation Plan

### 1. Environment Setup
- **Python Environment**: Set up virtual environment with required dependencies
- **Dependencies**: `nba_api`, `pandas`, `numpy`, `scikit-learn`, `xgboost`, `sqlite3`, `pyyaml`, `python-dotenv`
- **Model Integration**: Load the trained `xgb_pipeline.pkl` from the model directory
- **Database Connection**: Connect to the existing SQLite database used by the API

### 2. Data Collection Module (`data_collector.py`)
**Purpose**: Fetch NBA game data for completed games on the target date

**Key Functions**:
- `get_completed_games_for_date(date)` - Get all finished games for a specific date
- `fetch_game_details(game_id)` - Get detailed game information
- `get_team_data(team_id, season)` - Fetch team statistics and rankings
- `calculate_historical_metrics(home_team, away_team, date)` - Calculate rivalry scores, head-to-head records

**NBA API Endpoints to Use**:
- `leaguegamefinder.LeagueGameFinder` - Find games by date
- `boxscoresummaryv2.BoxScoreSummaryV2` - Game details and lead changes
- `winprobabilitypbp.WinProbabilityPBP` - Competitive seconds calculation
- `leaguestandingsv3.LeagueStandingsV3` - Team rankings and conference standings
- `teamgamelogs.TeamGameLogs` - Recent team performance

**Data Validation**:
- Verify games are completed (final status)
- Ensure all required data is available
- Handle API rate limiting with retry mechanisms

### 3. Feature Engineering Module (`feature_engineer.py`)
**Purpose**: Transform raw NBA data into features matching the training dataset

**Features to Calculate** (based on your enriched_data):
- `diff_ranks` - Difference in team rankings
- `inter_conference` - Boolean for inter-conference games (East vs West)
- `scores_diff` - Final score difference (for validation)
- `position_score` - Team position strength metric
- `competitive_seconds` - Time spent within 5-point margin
- `lead_changes` - Number of lead changes during the game
- `rivalry_score` - Historical rivalry metric based on playoff meetings and close games

**Key Functions**:
- `extract_features(game_data)` - Main feature extraction pipeline
- `calculate_rivalry_score(home_team, away_team, game_date)` - Rivalry calculation
- `calculate_competitive_seconds(game_id)` - Close game analysis
- `get_team_rankings(date)` - Current standings and rankings
- `validate_feature_schema(features)` - Ensure feature compatibility with model

### 4. Prediction Module (`predictor.py`)
**Purpose**: Load the trained model and generate predictions

**Key Functions**:
- `load_model()` - Load the XGBoost pipeline from `../nba-predictions-model/xgb_pipeline.pkl`
- `predict_game_quality(features)` - Generate prediction using the trained model
- `calculate_confidence(prediction_proba)` - Determine confidence level (high/medium/low)
- `format_prediction_output(prediction, probability, confidence)` - Structure results

**Prediction Output Format**:
```python
{
    "game_id": "string",
    "prediction": {
        "classification": "good" | "bad",
        "rating": int,  # 0-100 scale
        "probability": {
            "good": float,  # 0.0-1.0
            "bad": float    # 0.0-1.0
        },
        "confidence": "high" | "medium" | "low"
    },
    "features_used": dict,
    "prediction_date": "ISO datetime"
}
```

### 5. Database Management Module (`database_manager.py`)
**Purpose**: Handle all database operations for storing predictions

**Database Schema** (extend existing):
```sql
-- Add columns to existing games table or create predictions table
ALTER TABLE games ADD COLUMN predicted_at DATETIME;
ALTER TABLE games ADD COLUMN model_version VARCHAR(50);
ALTER TABLE games ADD COLUMN features_json TEXT;

-- Or create separate predictions table
CREATE TABLE IF NOT EXISTS game_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id VARCHAR(50) NOT NULL,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    game_date DATE NOT NULL,
    classification VARCHAR(10) NOT NULL,
    rating INTEGER NOT NULL,
    probability_good REAL NOT NULL,
    probability_bad REAL NOT NULL,
    confidence VARCHAR(10) NOT NULL,
    features_json TEXT,
    predicted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50),
    FOREIGN KEY (home_team_id) REFERENCES teams (id),
    FOREIGN KEY (away_team_id) REFERENCES teams (id)
);
```

**Key Functions**:
- `connect_to_database()` - Establish database connection
- `save_prediction(prediction_data)` - Store prediction results
- `check_existing_prediction(game_id)` - Avoid duplicate predictions
- `update_prediction(game_id, new_prediction)` - Update existing predictions
- `get_predictions_by_date(date)` - Retrieve predictions for validation

### 6. Main Orchestration Script (`main.py`)
**Purpose**: Coordinate the entire prediction workflow

**Workflow**:
1. **Initialization**
   - Load configuration
   - Set up logging
   - Validate model file exists
   - Test database connection

2. **Data Collection**
   - Determine target date (default: yesterday)
   - Fetch completed games for the date
   - Collect detailed game data and team information
   - Validate data completeness

3. **Feature Engineering**
   - Transform raw data into model features
   - Validate feature schema compatibility
   - Handle missing data gracefully

4. **Prediction Generation**
   - Load trained XGBoost model
   - Generate predictions for each game
   - Calculate confidence scores

5. **Data Storage**
   - Save predictions to database
   - Log successful completions
   - Handle errors gracefully

6. **Validation & Reporting**
   - Verify stored predictions
   - Generate summary report
   - Log performance metrics

**Command Line Interface**:
```bash
python main.py                          # Process yesterday's games
python main.py --date 2024-01-15       # Process specific date
python main.py --date 2024-01-15 --force # Overwrite existing predictions
python main.py --validate              # Validate configuration and model
```

### 7. Configuration Management (`config/config.yaml`)
```yaml
# NBA API Configuration
nba_api:
  rate_limit_delay: 1  # seconds between requests
  retry_attempts: 3
  timeout: 30

# Model Configuration
model:
  path: "../nba-predictions-model/xgb_pipeline.pkl"
  version: "1.0"
  feature_version: "1.0"

# Database Configuration
database:
  path: "../nba-predictions-api/data/nba_predictions.db"
  backup_enabled: true
  backup_path: "./backups/"

# Prediction Configuration
prediction:
  confidence_thresholds:
    high: 0.8
    medium: 0.6
  default_date_offset: -1  # days (yesterday)

# Logging Configuration
logging:
  level: "INFO"
  file_path: "./logs/scheduler.log"
  max_file_size: "10MB"
  backup_count: 5
```

### 8. Error Handling & Logging
**Error Scenarios to Handle**:
- NBA API rate limiting or downtime
- Missing or incomplete game data
- Model loading failures
- Database connection issues
- Feature schema mismatches

**Logging Strategy**:
- Structured logging with timestamps
- Performance metrics (processing time, games processed)
- Error tracking with stack traces
- Daily summary reports

### 9. Testing Strategy
**Unit Tests**:
- Data collection with mocked NBA API responses
- Feature engineering with known game data
- Prediction generation with test features
- Database operations with test database

**Integration Tests**:
- End-to-end workflow with historical data
- API error handling scenarios
- Database transaction rollbacks

### 10. Deployment Considerations
**Cron Job Setup**:
```bash
# Run daily at 2 AM to process previous day's games
0 2 * * * /path/to/venv/bin/python /path/to/nba-predictions-scheduled-job/src/main.py
```

**Environment Variables**:
```bash
NBA_PREDICTIONS_DB_PATH=/path/to/database.db
NBA_MODEL_PATH=/path/to/xgb_pipeline.pkl
LOG_LEVEL=INFO
BACKUP_ENABLED=true
```

**Monitoring**:
- Log aggregation for error tracking
- Performance metrics monitoring
- Alert system for failed runs
- Database size monitoring

## Success Criteria
1. **Automated Data Collection**: Successfully fetch NBA game data daily
2. **Accurate Feature Engineering**: Generate features matching training data schema
3. **Reliable Predictions**: Consistent model predictions with confidence scores
4. **Data Persistence**: Predictions stored correctly in database
5. **Error Resilience**: Graceful handling of API failures and data issues
6. **Frontend Integration**: Predictions appear correctly in the web application
7. **Performance**: Process daily games within reasonable time limits (< 10 minutes)

## Future Enhancements
- **Real-time Predictions**: Generate predictions before games start
- **Model Retraining**: Periodic model updates with new data
- **Advanced Features**: Player injury status, weather conditions, etc.
- **Prediction Accuracy Tracking**: Compare predictions with actual game outcomes
- **Multi-model Ensemble**: Combine multiple prediction models
- **API Integration**: Direct integration with the NBA Predictions API

## Timeline
- **Week 1**: Project setup, data collection module
- **Week 2**: Feature engineering and prediction modules
- **Week 3**: Database integration and main orchestration
- **Week 4**: Testing, deployment, and documentation