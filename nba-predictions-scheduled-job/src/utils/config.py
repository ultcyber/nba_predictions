"""Configuration management using Pydantic Settings."""

from pathlib import Path
from typing import Dict
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class NBAApiSettings(BaseModel):
    """NBA API configuration."""
    rate_limit_delay: float = Field(default=1.0, description="Seconds between API requests")
    retry_attempts: int = Field(default=3, description="Number of retry attempts")
    timeout: int = Field(default=30, description="Request timeout in seconds")


class ModelSettings(BaseModel):
    """Model configuration."""
    path: str = Field(default="../nba-predictions-model/xgb_pipeline.pkl", description="Path to trained model")
    version: str = Field(default="1.0", description="Model version")
    feature_version: str = Field(default="1.0", description="Feature schema version")


class DatabaseSettings(BaseModel):
    """Database configuration."""
    path: str = Field(default="../nba-predictions-api/data/nba_predictions.db", description="Database file path")
    backup_enabled: bool = Field(default=True, description="Enable database backups")
    backup_path: str = Field(default="./backups/", description="Backup directory path")


class PredictionSettings(BaseModel):
    """Prediction configuration."""
    confidence_thresholds: Dict[str, float] = Field(
        default={"high": 0.8, "medium": 0.6}, 
        description="Confidence level thresholds"
    )
    default_date_offset: int = Field(default=-1, description="Default date offset in days")


class LoggingSettings(BaseModel):
    """Logging configuration."""
    level: str = Field(default="INFO", description="Logging level")
    file_path: str = Field(default="./logs/scheduler.log", description="Log file path")
    max_file_size: str = Field(default="10MB", description="Maximum log file size")
    backup_count: int = Field(default=5, description="Number of log file backups")


class Settings(BaseSettings):
    """Main application settings."""
    
    # Nested configuration sections
    nba_api: NBAApiSettings = Field(default_factory=NBAApiSettings)
    model: ModelSettings = Field(default_factory=ModelSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    prediction: PredictionSettings = Field(default_factory=PredictionSettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)
    
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        env_nested_delimiter='__',  # Allows NBA_API__RATE_LIMIT_DELAY
        env_prefix='NBA_',
        case_sensitive=False,
        extra='ignore'
    )
    
    @property
    def database_path_resolved(self) -> Path:
        """Get resolved database path."""
        return Path(self.database.path).resolve()
    
    @property
    def model_path_resolved(self) -> Path:
        """Get resolved model path."""
        return Path(self.model.path).resolve()
    
    @property
    def log_file_path_resolved(self) -> Path:
        """Get resolved log file path."""
        path = Path(self.logging.file_path)
        # Create log directory if it doesn't exist
        path.parent.mkdir(parents=True, exist_ok=True)
        return path.resolve()
    
    def validate_paths(self) -> bool:
        """Validate that required paths exist."""
        model_path = self.model_path_resolved
        db_path = self.database_path_resolved
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        if not db_path.parent.exists():
            raise FileNotFoundError(f"Database directory not found: {db_path.parent}")
        
        return True


# Global settings instance
settings = Settings()