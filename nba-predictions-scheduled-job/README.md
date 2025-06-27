# NBA Predictions Scheduled Job

Automated system for collecting NBA game data, generating predictions using a trained XGBoost model, and storing results in the database.

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