"""Prediction module for loading XGBoost model and generating predictions."""

import pickle
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
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
        self.model_version = settings.model.version
        self.feature_version = settings.model.feature_version
        self.confidence_thresholds = settings.prediction.confidence_thresholds
        
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
                self.model = pickle.load(f)
            
            # Validate model object
            if self.model is None:
                raise ModelLoadError("Loaded model is None")
            
            # Check if model has required methods
            if not hasattr(self.model, 'predict') or not hasattr(self.model, 'predict_proba'):
                raise ModelLoadError("Model missing required predict/predict_proba methods")
            
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
            Prediction dictionary with classification, probabilities, and confidence
            
        Raises:
            PredictionError: If prediction generation fails
        """
        if self.model is None:
            raise PredictionError("Model not loaded")
        
        if features_df.empty or len(features_df) != 1:
            raise PredictionError(f"Expected single-row DataFrame, got {len(features_df)} rows")
        
        try:
            logger.debug("Generating prediction with XGBoost model")
            
            # Get prediction probabilities
            pred_proba = self.model.predict_proba(features_df)
            
            if pred_proba is None or len(pred_proba) == 0:
                raise PredictionError("Model returned empty probabilities")
            
            if len(pred_proba[0]) != 2:
                raise PredictionError(f"Expected 2 class probabilities, got {len(pred_proba[0])}")
            
            # Extract probabilities for each class
            prob_bad = float(pred_proba[0][0])   # Class 0 (bad game)
            prob_good = float(pred_proba[0][1])  # Class 1 (good game)
            
            # Validate probabilities
            if not (0 <= prob_bad <= 1 and 0 <= prob_good <= 1):
                raise PredictionError(f"Invalid probabilities: bad={prob_bad}, good={prob_good}")
            
            if not abs((prob_bad + prob_good) - 1.0) < 0.001:
                raise PredictionError(f"Probabilities don't sum to 1: {prob_bad + prob_good}")
            
            # Determine classification
            classification = "good" if prob_good > prob_bad else "bad"
            
            # Calculate rating (0-100 scale)
            rating = self._calculate_rating(prob_good)
            
            # Determine confidence level
            confidence = self._calculate_confidence(max(prob_good, prob_bad))
            
            prediction = {
                "classification": classification,
                "rating": rating,
                "probability": {
                    "good": round(prob_good, 6),
                    "bad": round(prob_bad, 6)
                },
                "confidence": confidence
            }
            
            logger.debug(f"Generated prediction: {prediction}")
            return prediction
            
        except Exception as e:
            if isinstance(e, PredictionError):
                raise
            raise PredictionError("Failed to generate prediction") from e
    
    def _calculate_rating(self, prob_good: float) -> int:
        """Calculate 0-100 rating based on good game probability.
        
        Args:
            prob_good: Probability of good game (0.0 to 1.0)
            
        Returns:
            Rating from 0 to 100
        """
        # Convert probability to 0-100 scale
        rating = int(round(prob_good * 100))
        
        # Ensure rating is within bounds
        rating = max(0, min(100, rating))
        
        return rating
    
    def _calculate_confidence(self, max_probability: float) -> str:
        """Calculate confidence level based on maximum class probability.
        
        Args:
            max_probability: Maximum probability among all classes
            
        Returns:
            Confidence level: "high", "medium", or "low"
        """
        thresholds = self.confidence_thresholds
        
        if max_probability >= thresholds["high"]:
            return "high"
        elif max_probability >= thresholds["medium"]:
            return "medium"
        else:
            return "low"
    
    def create_full_prediction(
        self, 
        game_data: Dict[str, Any], 
        features: Dict[str, Any], 
        prediction: Dict[str, Any]
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
            
            # Prediction results
            "classification": prediction["classification"],
            "rating": prediction["rating"],
            "probability_good": prediction["probability"]["good"],
            "probability_bad": prediction["probability"]["bad"],
            "confidence": prediction["confidence"],
            
            # Metadata
            "features_json": self._features_to_json(features),
            "predicted_at": datetime.utcnow().isoformat(),
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
            "confidence_thresholds": self.confidence_thresholds,
            "model_type": type(self.model).__name__
        }