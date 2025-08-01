"""Prediction module for loading XGBoost model and generating predictions."""

import joblib
from pathlib import Path
from typing import Dict, Any
from datetime import datetime, timezone
import pandas as pd
import numpy as np

from .utils.config import settings
from .utils.logger import logger
from .utils.exceptions import PredictionError, ModelLoadError


class GamePredictor:
    """Loads trained XGBoost model and generates game quality predictions."""
    
    def __init__(self):
        """Initialize predictor and load model."""
        self.model = None
        self.model_version = settings.model_version
        self.feature_version = settings.feature_version
        
        # Load model during initialization
        self._load_model()
    
    def _load_model(self) -> None:
        """Load the trained XGBoost pipeline from pickle file.
        
        Raises:
            ModelLoadError: If model loading fails
        """
        model_path = settings.model_path_resolved
        
        if not model_path.exists():
            raise ModelLoadError(f"Model file not found: {model_path}")
        
        try:
            logger.info(f"Loading XGBoost model from {model_path}")
            
            with open(model_path, 'rb') as f:
                self.model = joblib.load(model_path)
            
            # Validate model object
            if self.model is None:
                raise ModelLoadError("Loaded model is None")
            
            # Check if model has required methods
            if not hasattr(self.model, 'predict'):
                raise ModelLoadError("Model missing required predict methods")
            
            logger.info(f"Successfully loaded XGBoost model (version {self.model_version})")
            
        except Exception as e:
            if isinstance(e, ModelLoadError):
                raise
            raise ModelLoadError(f"Failed to load model from {model_path}") from e
    
    def predict_game_quality(self, features_df: pd.DataFrame) -> Dict[str, Any]:
        """Generate prediction for game quality using trained model.
        
        Args:
            features_df: Single-row DataFrame with game features
            
        Returns:
            Prediction dictionary with ratings
            
        Raises:
            PredictionError: If prediction generation fails
        """
        if self.model is None:
            raise PredictionError("Model not loaded")
        
        if features_df.empty or len(features_df) != 1:
            raise PredictionError(f"Expected single-row DataFrame, got {len(features_df)} rows")
        
        try:
            logger.debug("Generating prediction with XGBoost model")
            
            # Get prediction rating
            rating_array = self.model.predict(features_df)
            
            # Extract scalar value from numpy array and round to 2 decimal places
            if hasattr(rating_array, 'item'):
                raw_rating = float(rating_array.item())
            elif hasattr(rating_array, '__getitem__') and len(rating_array) > 0:
                raw_rating = float(rating_array[0])
            else:
                raw_rating = float(rating_array)
            
            # Clamp rating to 0-100 range to match training data bounds
            rating = round(max(0.0, min(100.0, raw_rating)), 2)
            
            prediction = {
                "rating": rating,
            }
            
            logger.debug(f"Generated prediction: {prediction}")
            return prediction
            
        except Exception as e:
            if isinstance(e, PredictionError):
                raise
            raise PredictionError("Failed to generate prediction") from e
    
    def create_full_prediction(
        self, 
        game_data: Dict[str, Any], 
        features: Dict[str, Any], 
        prediction: Dict[str, float]
    ) -> Dict[str, Any]:
        """Create complete prediction record for database storage.
        
        Args:
            game_data: Raw game data
            features: Extracted features
            prediction: Model prediction
            
        Returns:
            Complete prediction record
        """
        return {
            # Game identification
            "game_id": game_data["game_id"],
            "home_team_id": game_data["home_team_id"],
            "away_team_id": game_data["away_team_id"],
            "game_date": game_data["date"],
            
            # Team information (for database operations)
            "home_team_abbreviation": game_data.get("home_team_abbreviation"),
            "away_team_abbreviation": game_data.get("away_team_abbreviation"),
            
            # Prediction results
            "rating": prediction["rating"],
            
            # Metadata
            "features_json": self._features_to_json(features),
            "predicted_at": datetime.now(timezone.utc).isoformat(),
            "model_version": self.model_version,
            "feature_version": self.feature_version
        }
    
    def _features_to_json(self, features: Dict[str, Any]) -> str:
        """Convert features dictionary to JSON string for storage.
        
        Args:
            features: Features dictionary
            
        Returns:
            JSON string representation
        """
        import json
        
        try:
            # Convert numpy types to native Python types for JSON serialization
            json_features = {}
            for key, value in features.items():
                if isinstance(value, (np.integer, np.floating)):
                    json_features[key] = value.item()
                else:
                    json_features[key] = value
            
            return json.dumps(json_features, sort_keys=True)
            
        except Exception as e:
            logger.error(f"Error converting features to JSON: {e}")
            return "{}"
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model.
        
        Returns:
            Dictionary with model information
        """
        if self.model is None:
            return {"status": "not_loaded"}
        
        return {
            "status": "loaded",
            "model_version": self.model_version,
            "feature_version": self.feature_version,
            "model_type": type(self.model).__name__
        }