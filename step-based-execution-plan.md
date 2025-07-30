# Step-Based Execution Plan for NBA Predictions Scheduled Job

## Overview

This plan details how to modify the current NBA predictions scheduled job to support step-based execution with serialization points. This allows running the pipeline up to specific steps, saving intermediate results, and resuming from any step using JSON files.

## Current Architecture Analysis

The existing system (`nba-predictions-scheduled-job/`) has these components:
- **Data Collection** (`data_collector.py`) - NBA API interactions
- **Feature Engineering** (`feature_engineer.py`) - Transforms raw data into ML features  
- **Prediction** (`predictor.py`) - Loads XGBoost model and generates predictions
- **Database Management** (`database_manager.py`) - Stores results
- **Main Orchestrator** (`main.py`) - Coordinates the entire workflow

## Proposed Step-Based Architecture

### Execution Steps & Boundaries

#### **Step 1: Data Collection**
- **Input**: Date, game parameters
- **Process**: Fetch games from NBA API, get basic game details
- **Output**: `collected_games.json`
- **Dependencies**: `nba_api`, `requests`

#### **Step 2: Feature Engineering** 
- **Input**: `collected_games.json` OR fresh data collection
- **Process**: Calculate all features (rivalry, competitive seconds, etc.)
- **Output**: `engineered_features.json`
- **Dependencies**: `nba_api`, `pandas`, `numpy`

#### **Step 3: Prediction**
- **Input**: `engineered_features.json` OR previous steps
- **Process**: Load model, generate predictions
- **Output**: `predictions.json`
- **Dependencies**: `scikit-learn`, `xgboost`, `joblib`

#### **Step 4: Database Storage**
- **Input**: `predictions.json` OR previous steps
- **Process**: Save to database
- **Output**: Database records
- **Dependencies**: Database drivers

## Command Line Interface

### New Flags

```bash
# Run complete pipeline (current behavior)
python main.py --date 2024-01-15

# Run until data collection
python main.py --date 2024-01-15 --until-step collection --output collected_games.json

# Run until feature engineering
python main.py --date 2024-01-15 --until-step features --output engineered_features.json

# Run until prediction (no database save)
python main.py --date 2024-01-15 --until-step prediction --output predictions.json

# Start from collected data
python main.py --from-step features --input collected_games.json --output engineered_features.json

# Start from features 
python main.py --from-step prediction --input engineered_features.json --output predictions.json

# Start from predictions (save to DB)
python main.py --from-step storage --input predictions.json
```

### Flag Definitions

- `--until-step`: Stop execution after specified step (`collection`, `features`, `prediction`, `storage`)
- `--from-step`: Start execution from specified step (`features`, `prediction`, `storage`)
- `--input`: Input JSON file path (required when using `--from-step`)
- `--output`: Output JSON file path (required when using `--until-step`)

## Step-Specific Requirements

### **requirements-collection.txt** (Data Collection Only)
```txt
nba_api>=1.4.1
python-dotenv>=1.0.0
requests>=2.31.0
```

### **requirements-features.txt** (Collection + Features)
```txt
nba_api>=1.4.1
pandas>=2.2.0
numpy>=1.26.0
python-dotenv>=1.0.0
requests>=2.31.0
```

### **requirements-prediction.txt** (Features + ML)
```txt
pandas>=2.2.0
numpy>=1.26.0
scikit-learn==1.6.1
xgboost>=2.1.0
joblib>=1.3.0
python-dotenv>=1.0.0
```

### **requirements-storage.txt** (Prediction + Database)
```txt
pandas>=2.2.0
numpy>=1.26.0
python-dotenv>=1.0.0
# Database drivers would be added here
```

## JSON Schemas

### **collected_games.json**
```json
{
  "metadata": {
    "step": "collection",
    "timestamp": "2024-01-15T10:30:00Z",
    "target_date": "2024-01-15",
    "total_games": 8
  },
  "games": [
    {
      "game_id": "0022400123",
      "date": "2024-01-15",
      "home_team_id": 1610612747,
      "away_team_id": 1610612738,
      "home_team_abbreviation": "LAL",
      "away_team_abbreviation": "BOS",
      "season_id": "22024",
      "home_team_score": 115,
      "away_team_score": 108,
      "lead_changes": 8,
      "times_tied": 4,
      "game_status": "Final",
      "attendance": 18997
    }
  ]
}
```

### **engineered_features.json**
```json
{
  "metadata": {
    "step": "features", 
    "timestamp": "2024-01-15T10:45:00Z",
    "input_source": "collected_games.json",
    "total_games": 8
  },
  "games": [
    {
      "game_id": "0022400123",
      "raw_data": {
        "game_id": "0022400123",
        "date": "2024-01-15",
        "home_team_id": 1610612747,
        "away_team_id": 1610612738,
        "home_team_abbreviation": "LAL",
        "away_team_abbreviation": "BOS",
        "season_id": "22024",
        "home_team_score": 115,
        "away_team_score": 108,
        "lead_changes": 8,
        "times_tied": 4,
        "game_status": "Final",
        "attendance": 18997
      },
      "features": {
        "diff_ranks": 3,
        "inter_conference": 1,
        "scores_diff": 7,
        "position_score": 1.533333,
        "competitive_seconds": 1847.5,
        "lead_changes": 8,
        "rivalry_score": 0.42
      }
    }
  ]
}
```

### **predictions.json**
```json
{
  "metadata": {
    "step": "prediction",
    "timestamp": "2024-01-15T11:00:00Z", 
    "input_source": "engineered_features.json",
    "model_version": "1.0",
    "total_games": 8
  },
  "predictions": [
    {
      "game_id": "0022400123",
      "rating": 87.5,
      "features": {
        "diff_ranks": 3,
        "inter_conference": 1,
        "scores_diff": 7,
        "position_score": 1.533333,
        "competitive_seconds": 1847.5,
        "lead_changes": 8,
        "rivalry_score": 0.42
      },
      "raw_data": {
        "game_id": "0022400123",
        "date": "2024-01-15",
        "home_team_id": 1610612747,
        "away_team_id": 1610612738,
        "home_team_abbreviation": "LAL",
        "away_team_abbreviation": "BOS",
        "season_id": "22024",
        "home_team_score": 115,
        "away_team_score": 108,
        "lead_changes": 8,
        "times_tied": 4,
        "game_status": "Final",
        "attendance": 18997
      }
    }
  ]
}
```

## Implementation Changes

### Main.py Modifications

```python
def main():
    parser = argparse.ArgumentParser(...)
    
    # Execution control flags
    parser.add_argument(
        '--until-step', 
        choices=['collection', 'features', 'prediction', 'storage'],
        help='Stop execution after specified step'
    )
    parser.add_argument(
        '--from-step', 
        choices=['features', 'prediction', 'storage'],
        help='Start execution from specified step'
    )
    parser.add_argument(
        '--input', 
        help='Input JSON file path (required when using --from-step)'
    )
    parser.add_argument(
        '--output', 
        help='Output JSON file path (required when using --until-step)'
    )
    
    # ... existing args
    
    args = parser.parse_args()
    
    # Validation
    if args.from_step and not args.input:
        parser.error("--input is required when using --from-step")
    if args.until_step and not args.output:
        parser.error("--output is required when using --until-step")
    
    # Determine execution steps
    if args.from_step:
        start_step = args.from_step
        input_data = load_json(args.input)
    else:
        start_step = 'collection'
        input_data = None
        
    if args.until_step:
        end_step = args.until_step
    else:
        end_step = 'storage'  # Full pipeline
        
    # Execute pipeline with step control
    scheduler = NBAScheduler()
    result = scheduler.run_pipeline(
        start_step=start_step,
        end_step=end_step, 
        input_data=input_data,
        output_path=args.output,
        target_date=target_date
    )
```

### NBAScheduler Class Changes

```python
class NBAScheduler:
    def run_pipeline(self, start_step, end_step, input_data=None, output_path=None, target_date=None):
        """Run pipeline from start_step to end_step with optional serialization."""
        
        steps = ['collection', 'features', 'prediction', 'storage']
        start_idx = steps.index(start_step)
        end_idx = steps.index(end_step)
        
        # Validate step sequence
        if start_idx > end_idx:
            raise ValueError(f"Invalid step sequence: {start_step} -> {end_step}")
        
        # Execute steps in sequence
        data = input_data
        for i in range(start_idx, end_idx + 1):
            step = steps[i]
            data = self._execute_step(step, data, target_date)
            
            # Save intermediate results if this is the end step and output is specified
            if i == end_idx and output_path:
                self._save_step_output(step, data, output_path)
        
        return data
    
    def _execute_step(self, step, input_data, target_date):
        """Execute a single pipeline step."""
        if step == 'collection':
            return self._step_collection(target_date)
        elif step == 'features':
            return self._step_features(input_data, target_date)
        elif step == 'prediction':
            return self._step_prediction(input_data)
        elif step == 'storage':
            return self._step_storage(input_data)
    
    def _save_step_output(self, step, data, output_path):
        """Save step output to JSON file."""
        output = {
            "metadata": {
                "step": step,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_games": len(data.get('games', data.get('predictions', [])))
            }
        }
        
        if step == 'collection':
            output["games"] = data
        elif step == 'features':
            output["games"] = data
        elif step == 'prediction':
            output["predictions"] = data
            
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
```

## Usage Examples

### Distributed Processing

```bash
# Server 1: Data collection (lightweight)
pip install -r requirements-collection.txt
python main.py --date 2024-01-15 --until-step collection --output /shared/collected.json

# Server 2: Feature engineering (API-heavy)  
pip install -r requirements-features.txt
python main.py --from-step features --input /shared/collected.json --output /shared/features.json

# Server 3: ML prediction (GPU/CPU intensive)
pip install -r requirements-prediction.txt
python main.py --from-step prediction --input /shared/features.json --output /shared/predictions.json

# Server 4: Database storage
pip install -r requirements-storage.txt  
python main.py --from-step storage --input /shared/predictions.json
```

### Development & Testing

```bash
# Test feature engineering on existing data
python main.py --from-step features --input test_data/collected_games.json --output debug_features.json

# Test prediction without hitting APIs
python main.py --from-step prediction --input debug_features.json --output debug_predictions.json

# Inspect intermediate results
cat debug_features.json | jq '.games[0].features'
```

## Benefits

1. **Minimal Code Changes** - Extends existing architecture without major refactoring
2. **Backward Compatibility** - Current usage patterns continue to work
3. **Flexible Deployment** - Install only needed dependencies per server
4. **Easy Debugging** - Inspect intermediate outputs for troubleshooting
5. **Resource Optimization** - Run heavy steps on appropriate hardware
6. **Development Workflow** - Test individual steps easily during development
7. **Fault Tolerance** - Resume from any step if pipeline fails
8. **Cost Optimization** - Use different server tiers for different computational needs

## Implementation Timeline

### Phase 1: Core Step Infrastructure
- [ ] Add new command line arguments
- [ ] Implement step execution logic in NBAScheduler
- [ ] Add JSON serialization/deserialization
- [ ] Create step-specific requirements files

### Phase 2: Step Implementation
- [ ] Implement `_step_collection()` method
- [ ] Implement `_step_features()` method  
- [ ] Implement `_step_prediction()` method
- [ ] Implement `_step_storage()` method

### Phase 3: Testing & Validation
- [ ] Unit tests for each step
- [ ] End-to-end integration tests
- [ ] JSON schema validation
- [ ] Error handling and edge cases

### Phase 4: Documentation & Deployment
- [ ] Update README with new usage patterns
- [ ] Create deployment guides for distributed setup
- [ ] Performance benchmarking
- [ ] Production rollout

This approach provides maximum flexibility while maintaining the current codebase structure and allowing for seamless migration between monolithic and distributed execution patterns.