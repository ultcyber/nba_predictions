"""Configuration management using python-dotenv."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""
    
    def __init__(self):
        # Logging settings
        self.log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
        self.log_file_path = os.getenv('LOG_FILE_PATH', './logs/scheduler.log')
        self.log_max_file_size = os.getenv('LOG_MAX_FILE_SIZE', '10MB')
        self.log_backup_count = int(os.getenv('LOG_BACKUP_COUNT', '5'))
        
        # NBA API settings
        self.nba_api_rate_limit_delay = float(os.getenv('NBA_API_RATE_LIMIT_DELAY', '1.0'))
        self.nba_api_retry_attempts = int(os.getenv('NBA_API_RETRY_ATTEMPTS', '3'))
        self.nba_api_timeout = int(os.getenv('NBA_API_TIMEOUT', '30'))
        
        # Model settings
        self.model_path = os.getenv('MODEL_PATH', '../nba-predictions-model/xgb_pipeline.pkl')
        self.model_version = os.getenv('MODEL_VERSION', '1.0')
        self.feature_version = os.getenv('FEATURE_VERSION', '1.0')
        
        # Database settings
        self.database_path = os.getenv('DATABASE_PATH', '../nba-predictions-api/data/nba_predictions.db')
        self.database_backup_enabled = os.getenv('BACKUP_ENABLED', 'true').lower() == 'true'
        self.database_backup_path = os.getenv('BACKUP_PATH', './backups/')
        
        # Prediction settings
        self.prediction_default_date_offset = int(os.getenv('DEFAULT_DATE_OFFSET', '-1'))
    
    @property
    def database_path_resolved(self) -> Path:
        """Get resolved database path."""
        return Path(self.database_path).resolve()
    
    @property
    def model_path_resolved(self) -> Path:
        """Get resolved model path."""
        return Path(self.model_path).resolve()
    
    @property
    def log_file_path_resolved(self) -> Path:
        """Get resolved log file path."""
        path = Path(self.log_file_path)
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