"""Custom exceptions for NBA predictions scheduler."""


class NBASchedulerError(Exception):
    """Base exception for NBA scheduler errors."""
    pass


class DataCollectionError(NBASchedulerError):
    """Error during NBA data collection."""
    pass


class FeatureEngineeringError(NBASchedulerError):
    """Error during feature engineering."""
    pass


class PredictionError(NBASchedulerError):
    """Error during prediction generation."""
    pass


class DatabaseError(NBASchedulerError):
    """Error during database operations."""
    pass


class ModelLoadError(NBASchedulerError):
    """Error loading the ML model."""
    pass


class ConfigurationError(NBASchedulerError):
    """Error in configuration."""
    pass