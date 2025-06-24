# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an NBA game predictions system consisting of two main components:
- **nba-predictions-model/**: Machine learning model for predicting NBA game ratings using XGBoost
- **nba-predictions-fe/**: React frontend application (currently in planning phase)

## Project Structure

### ML Model Component (`nba-predictions-model/`)
- **Training.ipynb**: Main training notebook that builds XGBoost pipeline for game rating prediction
- **Data-enriching.ipynb**: Data enrichment notebook that fetches NBA stats via nba_api and calculates features like rivalry scores, competitive seconds, and lead changes
- **Data-prediction.ipynb**: Prediction notebook for making predictions on new data
- **Predict-test.ipynb**: Testing predictions notebook
- **enriched_data**: Main dataset file (JSON format) containing enriched game features
- **complete**: Base dataset file 
- **xgb_pipeline.pkl**: Trained XGBoost pipeline with preprocessing steps
- **backups/**: Contains backup versions of data files and models

### Frontend Component (`nba-predictions-fe/`)
Currently contains planning documentation for a React + TypeScript + Vite application with Tailwind CSS.

## Key ML Model Features

The model predicts NBA game ratings based on these engineered features:
- **diff_ranks**: Ranking difference between teams
- **inter_conference**: Whether teams are from different conferences
- **scores_diff**: Score differential
- **position_score**: Calculated position-based score
- **lead_changes**: Number of lead changes in the game
- **rivalry_score**: Algorithm-calculated rivalry score based on playoff history and close games
- **competitive_seconds**: Time duration when score margin was ≤5 points

## Common Development Tasks

### Working with the ML Model
```bash
# Start Jupyter notebook server
jupyter notebook

# Run specific notebooks in order:
# 1. Data-enriching.ipynb (if updating data)
# 2. Training.ipynb (to retrain model)
# 3. Data-prediction.ipynb (for predictions)
```

### Model Pipeline
The trained model uses scikit-learn Pipeline with:
- StandardScaler for numerical features
- OneHotEncoder for categorical features  
- XGBoost regressor with specific hyperparameters

Key model files:
- Load trained pipeline: `joblib.load('xgb_pipeline.pkl')`
- Input format: Features must match training data structure
- Output: Estimated game rating (regression target)

## Data Sources & APIs

The model uses NBA API (`nba_api` package) to fetch:
- Game finder data for historical matchups
- Box score summaries for game statistics
- Win probability play-by-play data for competitive analysis
- Team static data for metadata

Rate limiting and retry logic implemented for API calls with exponential backoff.

## Important Implementation Notes

- Data enrichment process includes sophisticated retry mechanisms for API failures
- Rivalry score calculation looks back 5 years for playoff history and close games
- Competitive seconds calculation analyzes play-by-play data for close game moments
- All data files use JSON format for persistence
- Model trained on 1201 historical games with comprehensive feature engineering

## Frontend Development Plan

Based on `phase1_foundation.md`, the planned frontend will include:
- React + TypeScript + Vite setup
- Tailwind CSS for styling
- React Query for API communication
- Zustand for state management
- API integration with the ML model backend