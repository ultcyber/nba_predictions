# NBA Predictions Scheduled Job

Automated system for collecting NBA game data, generating predictions using a trained XGBoost model, and storing results in the database.

## Requirements

- Python 3.13 or higher

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy and configure environment:
```bash
cp .env.example .env
# Edit .env with your database and model paths
```

## Usage

### Traditional Full Pipeline

```bash
# Process yesterday's games (default)
python -m src.main

# Process specific date
python -m src.main --date 2024-01-15

# Force update existing predictions
python -m src.main --date 2024-01-15 --force

# Validate configuration
python -m src.main --validate
```

### Step-Based Execution

The system supports running individual steps with serialization for distributed processing:

```bash
# Run until data collection (lightweight)
python -m src.main --date 2024-01-15 --until-step collection --output collected_games.json

# Run until feature engineering (from collection or fresh)
python -m src.main --date 2024-01-15 --until-step features --output engineered_features.json
python -m src.main --from-step features --input collected_games.json --output engineered_features.json

# Run until prediction (from features or fresh)
python -m src.main --date 2024-01-15 --until-step prediction --output predictions.json
python -m src.main --from-step prediction --input engineered_features.json --output predictions.json

# Storage only (save predictions to database)
python -m src.main --from-step storage --input predictions.json
```

### Step-Specific Dependencies

For optimized deployments, install only required dependencies:

```bash
# Data collection only
pip install -r requirements-collection.txt

# Collection + feature engineering
pip install -r requirements-features.txt

# Feature engineering + ML prediction
pip install -r requirements-prediction.txt

# Prediction + database storage
pip install -r requirements-storage.txt

# Full pipeline (default)
pip install -r requirements.txt
```

### Distributed Processing Example

Run different steps on different servers for optimal resource usage:

```bash
# Server 1: Data collection (lightweight, NBA API calls)
pip install -r requirements-collection.txt
python -m src.main --date 2024-01-15 --until-step collection --output /shared/collected.json

# Server 2: Feature engineering (API-heavy, standings/rivalry calculations)  
pip install -r requirements-features.txt
python -m src.main --from-step features --input /shared/collected.json --output /shared/features.json

# Server 3: ML prediction (CPU/GPU intensive)
pip install -r requirements-prediction.txt
python -m src.main --from-step prediction --input /shared/features.json --output /shared/predictions.json

# Server 4: Database storage
pip install -r requirements-storage.txt  
python -m src.main --from-step storage --input /shared/predictions.json
```

## Cron Job

Daily execution at 2 AM:
```bash
0 2 * * * cd /path/to/nba-predictions-scheduled-job && /path/to/venv/bin/python -m src.main
```

## Features

- Collects NBA game data (nba_api)
- Extracts features: rankings, rivalry score, competitive seconds, etc.
- Generates predictions using trained XGBoost model
- Stores results in existing database for frontend consumption
- Comprehensive error handling and logging