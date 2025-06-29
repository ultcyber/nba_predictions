"""Main orchestration script for NBA predictions scheduled job."""

import argparse
import logging
import sys
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

from .data_collector import NBADataCollector
from .feature_engineer import FeatureEngineer
from .predictor import GamePredictor
from .database_manager import DatabaseManager
from .utils.config import settings
from .utils.logger import logger
from .utils.exceptions import (
    NBASchedulerError, DataCollectionError, FeatureEngineeringError,
    PredictionError, DatabaseError, ModelLoadError, ConfigurationError
)


class NBAScheduler:
    """Main scheduler class that orchestrates the prediction workflow."""
    
    def __init__(self):
        """Initialize the scheduler with all components."""
        self.data_collector = None
        self.feature_engineer = None
        self.predictor = None
        self.database_manager = None
        self.stats = {
            "start_time": None,
            "end_time": None,
            "target_date": None,
            "games_found": 0,
            "games_processed": 0,
            "games_saved": 0,
            "games_skipped": 0,
            "errors": []
        }
    
    def initialize_components(self) -> None:
        """Initialize all components required for prediction.
        
        Raises:
            NBASchedulerError: If component initialization fails
        """
        try:
            logger.info("Initializing NBA prediction components...")
            
            # Initialize data collector
            logger.debug("Initializing data collector")
            self.data_collector = NBADataCollector()
            
            # Initialize feature engineer
            logger.debug("Initializing feature engineer")
            self.feature_engineer = FeatureEngineer(self.data_collector)
            
            # Initialize predictor (loads model)
            logger.debug("Initializing predictor")
            self.predictor = GamePredictor()
            
            # Initialize database manager
            logger.debug("Initializing database manager")
            self.database_manager = DatabaseManager()
            
            logger.info("All components initialized successfully")
            
        except Exception as e:
            logger.error(f"Component initialization error: {e}")
            raise NBASchedulerError(f"Failed to initialize components: {e}") from e
    
    def run_predictions(
        self, 
        target_date: Optional[date] = None, 
        force_update: bool = False
    ) -> Dict[str, Any]:
        """Run the complete prediction workflow.
        
        Args:
            target_date: Date to process (defaults to yesterday)
            force_update: Whether to overwrite existing predictions
            
        Returns:
            Dictionary with execution results and statistics
        """
        self.stats["start_time"] = datetime.now(timezone.utc)
        
        try:
            # Determine target date
            if target_date is None:
                target_date = date.today() + timedelta(days=settings.prediction_default_date_offset)
            
            self.stats["target_date"] = target_date.isoformat()
            
            logger.info(f"Starting NBA predictions for {target_date}")
            
            # Initialize components
            self.initialize_components()
            
            # Step 1: Collect completed games
            logger.info("Step 1: Collecting completed games from NBA API")
            games = self._collect_games_data(target_date)
            
            if not games:
                logger.info(f"No completed games found for {target_date}")
                return self._finalize_stats(success=True)
            
            # Step 2: Process each game
            logger.info(f"Step 2: Processing {len(games)} games")
            processed_games = self._process_games(games, force_update)
            
            # Step 3: Generate and save predictions
            logger.info(f"Step 3: Generating predictions for {len(processed_games)} games")
            self._generate_and_save_predictions(processed_games)
            
            # Step 4: Create backup if enabled
            if settings.database_backup_enabled:
                logger.info("Step 4: Creating database backup")
                self.database_manager.backup_database()
            
            logger.info(f"Prediction workflow completed successfully")
            return self._finalize_stats(success=True)
            
        except Exception as e:
            logger.error(f"Prediction workflow failed: {e}")
            self.stats["errors"].append(str(e))
            return self._finalize_stats(success=False)
    
    def _collect_games_data(self, target_date: date) -> List[Dict[str, Any]]:
        """Collect completed games data for the target date.
        
        Args:
            target_date: Date to collect games for
            
        Returns:
            List of completed games with basic information
        """
        try:
            games = self.data_collector.get_completed_games_for_date(target_date)
            self.stats["games_found"] = len(games)
            
            if games:
                logger.info(f"Found {len(games)} completed games for {target_date}")
            else:
                logger.info(f"No completed games found for {target_date}")
            
            return games
            
        except DataCollectionError as e:
            logger.error(f"Failed to collect games data: {e}")
            raise
        except Exception as e:
            raise DataCollectionError(f"Unexpected error during game data collection") from e
    
    def _process_games(self, games: List[Dict[str, Any]], force_update: bool) -> List[Dict[str, Any]]:
        """Process games and collect detailed information.
        
        Args:
            games: List of basic game information
            force_update: Whether to process games that already have predictions
            
        Returns:
            List of games with detailed information ready for prediction
        """
        processed_games = []
        
        for game in games:
            try:
                game_id = game['game_id']
                
                # Check if prediction already exists
                if not force_update and self.database_manager.check_existing_prediction(game_id):
                    logger.debug(f"Prediction already exists for game {game_id}, skipping")
                    self.stats["games_skipped"] += 1
                    continue
                
                # Get detailed game information
                logger.debug(f"Processing game {game_id}")
                game_details = self.data_collector.fetch_game_details(game_id)
                
                # Merge basic and detailed information
                complete_game = {**game, **game_details}
                processed_games.append(complete_game)
                
                self.stats["games_processed"] += 1
                
            except Exception as e:
                error_msg = f"Failed to process game {game.get('game_id', 'unknown')}: {e}"
                logger.error(error_msg)
                self.stats["errors"].append(error_msg)
                continue
        
        logger.info(f"Successfully processed {len(processed_games)} games")
        return processed_games
    
    def _generate_and_save_predictions(self, games: List[Dict[str, Any]]) -> None:
        """Generate predictions and save to database.
        
        Args:
            games: List of games with complete information
        """
        for game in games:
            try:
                game_id = game['game_id']
                logger.debug(f"Generating prediction for game {game_id}")
                
                # Extract features
                features = self.feature_engineer.extract_features(game)
                logger.debug(f"Extracted features for game {game_id}")
                if logger.isEnabledFor(logging.DEBUG):
                    feature_summary = self.feature_engineer.create_feature_summary(features)
                    logger.debug(f"Features for game {game_id}:\n{feature_summary}")
                
                # Convert to DataFrame for model
                features_df = self.feature_engineer.features_to_dataframe(features)
                
                # Generate prediction
                prediction = self.predictor.predict_game_quality(features_df)
                logger.debug(f"Generated prediction for game {game_id}: {prediction['rating']}/100")
                
                # Create complete prediction record
                prediction_record = self.predictor.create_full_prediction(game, features, prediction)
                
                # Save to database
                success = self.database_manager.save_prediction(prediction_record)
                
                if success:
                    self.stats["games_saved"] += 1
                    logger.info(f"Saved prediction for game {game_id}: {prediction['rating']}/100")
                else:
                    logger.warning(f"Failed to save prediction for game {game_id}")
                
            except (FeatureEngineeringError, PredictionError, DatabaseError) as e:
                error_msg = f"Failed to generate/save prediction for game {game.get('game_id', 'unknown')}: {e}"
                logger.error(error_msg)
                self.stats["errors"].append(error_msg)
                continue
            except Exception as e:
                error_msg = f"Unexpected error processing game {game.get('game_id', 'unknown')}: {e}"
                logger.error(error_msg)
                self.stats["errors"].append(error_msg)
                continue
    
    def _finalize_stats(self, success: bool) -> Dict[str, Any]:
        """Finalize execution statistics.
        
        Args:
            success: Whether the overall execution was successful
            
        Returns:
            Complete statistics dictionary
        """
        self.stats["end_time"] = datetime.now(timezone.utc)
        self.stats["success"] = success
        
        if self.stats["start_time"]:
            duration = self.stats["end_time"] - self.stats["start_time"]
            self.stats["duration_seconds"] = duration.total_seconds()
        
        return self.stats
    
    def validate_configuration(self) -> bool:
        """Validate configuration and dependencies.
        
        Returns:
            True if validation passes, False otherwise
        """
        try:
            logger.info("Validating configuration and dependencies...")
            
            # Validate paths
            settings.validate_paths()
            
            # Try to initialize components
            self.initialize_components()
            
            # Get component info
            model_info = self.predictor.get_model_info()
            db_stats = self.database_manager.get_database_stats()
            
            logger.info("Configuration validation results:")
            logger.info(f"  Model: {model_info['status']} (version {model_info.get('model_version', 'unknown')})")
            logger.info(f"  Database: {db_stats.get('total_games', 0)} games, {db_stats.get('total_teams', 0)} teams")
            logger.info(f"  Existing predictions: {db_stats.get('games_with_predictions', 0)}")
            
            logger.info("✅ Configuration validation passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Configuration validation failed: {e}")
            return False
    
    def print_summary(self, stats: Dict[str, Any]) -> None:
        """Print execution summary.
        
        Args:
            stats: Execution statistics
        """
        print("\n" + "="*60)
        print("NBA PREDICTIONS EXECUTION SUMMARY")
        print("="*60)
        print(f"Target Date: {stats.get('target_date', 'N/A')}")
        print(f"Start Time: {stats.get('start_time', 'N/A')}")
        print(f"End Time: {stats.get('end_time', 'N/A')}")
        
        if stats.get('duration_seconds'):
            print(f"Duration: {stats['duration_seconds']:.1f} seconds")
        
        print(f"Success: {'✅ Yes' if stats.get('success') else '❌ No'}")
        print()
        print("PROCESSING RESULTS:")
        print(f"  Games Found: {stats.get('games_found', 0)}")
        print(f"  Games Processed: {stats.get('games_processed', 0)}")
        print(f"  Games Saved: {stats.get('games_saved', 0)}")
        print(f"  Games Skipped: {stats.get('games_skipped', 0)}")
        
        if stats.get('errors'):
            print(f"  Errors: {len(stats['errors'])}")
            print("\nERRORS:")
            for error in stats['errors'][:5]:  # Show first 5 errors
                print(f"  - {error}")
            if len(stats['errors']) > 5:
                print(f"  ... and {len(stats['errors']) - 5} more errors")
        
        print("="*60)


def main():
    """Main entry point for the NBA predictions scheduler."""
    parser = argparse.ArgumentParser(
        description="NBA Game Predictions Scheduler",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                          # Process yesterday's games
  python main.py --date 2024-01-15       # Process specific date
  python main.py --date 2024-01-15 --force # Overwrite existing predictions
  python main.py --validate              # Validate configuration only
        """
    )
    
    parser.add_argument(
        '--date',
        type=str,
        help='Date to process in YYYY-MM-DD format (default: yesterday)'
    )
    
    parser.add_argument(
        '--force',
        action='store_true',
        help='Overwrite existing predictions'
    )
    
    parser.add_argument(
        '--validate',
        action='store_true',
        help='Validate configuration and exit'
    )
    
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Suppress summary output'
    )
    
    args = parser.parse_args()
    
    # Initialize scheduler
    scheduler = NBAScheduler()
    
    try:
        # Validation mode
        if args.validate:
            success = scheduler.validate_configuration()
            sys.exit(0 if success else 1)
        
        # Parse target date
        target_date = None
        if args.date:
            try:
                target_date = datetime.strptime(args.date, '%Y-%m-%d').date()
            except ValueError:
                logger.error(f"Invalid date format: {args.date}. Use YYYY-MM-DD format.")
                sys.exit(1)
        
        # Run predictions
        stats = scheduler.run_predictions(
            target_date=target_date,
            force_update=args.force
        )
        
        # Print summary unless quiet mode
        if not args.quiet:
            scheduler.print_summary(stats)
        
        # Exit with appropriate code
        sys.exit(0 if stats.get('success') else 1)
        
    except KeyboardInterrupt:
        logger.info("Execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()