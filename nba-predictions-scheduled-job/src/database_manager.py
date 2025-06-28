"""Database management module for storing NBA game predictions."""

import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from .utils.config import settings
from .utils.logger import logger
from .utils.exceptions import DatabaseError


class DatabaseManager:
    """Manages SQLite database operations for NBA game predictions."""
    
    def __init__(self):
        """Initialize database manager."""
        self.db_path = Path(settings.database.path)
        self.backup_enabled = settings.database.backup_enabled
        self.backup_path = Path(settings.database.backup_path)
        
        # Verify database exists and has correct schema
        self._verify_database()
    
    def _verify_database(self) -> None:
        """Verify database exists and has the correct schema.
        
        Raises:
            DatabaseError: If database verification fails
        """
        if not self.db_path.exists():
            raise DatabaseError(f"Database file not found: {self.db_path}. Please run the API server first to initialize the database.")
        
        try:
            logger.info(f"Verifying database schema at {self.db_path}")
            
            with sqlite3.connect(self.db_path) as conn:
                # Enable foreign keys
                conn.execute("PRAGMA foreign_keys = ON")
                
                # Verify required tables exist
                self._verify_schema(conn)
            
            logger.info("Database schema verification completed successfully")
            
        except Exception as e:
            raise DatabaseError(f"Failed to verify database schema") from e
    
    def _verify_schema(self, conn: sqlite3.Connection) -> None:
        """Verify database schema matches the API expectations.
        
        Args:
            conn: Database connection
            
        Raises:
            DatabaseError: If schema verification fails
        """
        cursor = conn.cursor()
        
        # Check if required tables exist
        required_tables = ['teams', 'games']
        
        for table in required_tables:
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name=?
            """, (table,))
            
            if not cursor.fetchone():
                raise DatabaseError(f"Required table '{table}' not found in database. Please run the API server first.")
        
        # Check if games table has required prediction columns
        cursor.execute("PRAGMA table_info(games)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        
        required_columns = {
            'id': 'TEXT',
            'date': 'TEXT',
            'home_team_id': 'TEXT',
            'away_team_id': 'TEXT',
            'prediction_rating': 'REAL'
        }
        
        for col_name, col_type in required_columns.items():
            if col_name not in columns:
                raise DatabaseError(f"Missing required column '{col_name}' in games table")
            
        logger.debug("Database schema verification passed")
    
    def save_prediction(self, prediction_data: Dict[str, Any]) -> bool:
        """Save a game prediction to the games table.
        
        Args:
            prediction_data: Complete prediction data dictionary
            
        Returns:
            True if successful, False if game already exists
            
        Raises:
            DatabaseError: If save operation fails
        """
        try:
            logger.debug(f"Saving prediction for game {prediction_data['game_id']}")
            logger.debug(f"Prediction data keys: {list(prediction_data.keys())}")
            
            with sqlite3.connect(self.db_path) as conn:
                # Enable foreign keys
                conn.execute("PRAGMA foreign_keys = ON")
                
                cursor = conn.cursor()
                
                # First, ensure teams exist
                self._ensure_teams_exist(conn, [
                    prediction_data['home_team_id'],
                    prediction_data['away_team_id']
                ])
                
                # Insert or update game with prediction
                cursor.execute("""
                    INSERT OR REPLACE INTO games (
                        id, date, home_team_id, away_team_id,
                        prediction_rating, 
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    prediction_data['game_id'],
                    prediction_data['game_date'],
                    prediction_data['home_team_id'],
                    prediction_data['away_team_id'],
                    prediction_data['rating'],
                    datetime.now(timezone.utc).isoformat()
                ))
                
                conn.commit()
                
                logger.info(f"Successfully saved prediction for game {prediction_data['game_id']}")
                return True
                
        except sqlite3.IntegrityError as e:
            logger.error(f"SQLite integrity error: {e}")
            if "FOREIGN KEY constraint failed" in str(e):
                raise DatabaseError(f"Invalid team IDs in prediction data: {e}") from e
            else:
                raise DatabaseError(f"Database integrity error while saving prediction: {e}") from e
        except Exception as e:
            logger.error(f"Database error saving prediction: {e}")
            raise DatabaseError(f"Failed to save prediction for game {prediction_data['game_id']}: {e}") from e
    
    def _ensure_teams_exist(self, conn: sqlite3.Connection, team_ids: List[str]) -> None:
        """Ensure teams exist in the database by checking and inserting if needed.
        
        Args:
            conn: Database connection
            team_ids: List of team IDs to check
            
        Raises:
            DatabaseError: If teams don't exist and can't be created
        """
        cursor = conn.cursor()
        
        from nba_api.stats.static import teams as nba_teams
        from nba_api.stats.endpoints import leaguestandingsv3
        
        for team_id in team_ids:
            # Check if team exists
            cursor.execute("SELECT id FROM teams WHERE id = ?", (team_id,))
            
            if not cursor.fetchone():
                logger.warning(f"Team {team_id} not found in database - creating team record")
                
                # Get team info from NBA API
                all_teams = nba_teams.get_teams()
                team_info = next((t for t in all_teams if t['id'] == int(team_id)), None)
                
                if team_info:
                    # Get conference and division from standings
                    try:
                        standings = leaguestandingsv3.LeagueStandingsV3(
                            season="2024-25",
                            season_type="Regular Season"
                        )
                        standings_df = standings.get_data_frames()[0]
                        team_standing = standings_df[standings_df['TeamID'] == int(team_id)]
                        
                        if not team_standing.empty:
                            conference = team_standing.iloc[0].get('Conference', team_standing.iloc[0].get('CONFERENCE', 'Unknown'))
                        else:
                            conference = 'Unknown'
                    except:
                        conference = 'Unknown'
                    
                    # Insert team record
                    cursor.execute("""
                        INSERT INTO teams (id, name, abbreviation, conference)
                        VALUES (?, ?, ?, ?)
                    """, (
                        str(team_info['id']),
                        team_info['full_name'],
                        team_info['abbreviation'],
                        conference
                    ))
                    logger.info(f"Created team record for {team_info['full_name']} ({team_id}) - {conference} Conference")
                else:
                    raise DatabaseError(f"Team {team_id} not found in NBA API data")
        
        # Commit team insertions
        conn.commit()
    
    def check_existing_prediction(self, game_id: str) -> bool:
        """Check if a prediction already exists for a game.
        
        Args:
            game_id: NBA game ID
            
        Returns:
            True if prediction exists, False otherwise
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT COUNT(*) FROM games 
                    WHERE id = ? AND prediction_rating IS NOT NULL
                """, (game_id,))
                
                count = cursor.fetchone()[0]
                return count > 0
                
        except Exception as e:
            logger.error(f"Error checking existing prediction for game {game_id}: {e}")
            return False
    
    def get_predictions_by_date(self, target_date: str) -> List[Dict[str, Any]]:
        """Get all predictions for a specific date.
        
        Args:
            target_date: Date in YYYY-MM-DD format
            
        Returns:
            List of game dictionaries with predictions
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Enable row factory for dictionary results
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT 
                        g.*,
                        ht.name as home_team_name,
                        ht.abbreviation as home_team_abbreviation,
                        ht.conference as home_team_conference,
                        at.name as away_team_name,
                        at.abbreviation as away_team_abbreviation,
                        at.conference as away_team_conference
                    FROM games g
                    JOIN teams ht ON g.home_team_id = ht.id
                    JOIN teams at ON g.away_team_id = at.id
                    WHERE g.date = ? AND g.prediction_rating IS NOT NULL
                    ORDER BY g.created_at DESC
                """, (target_date,))
                
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Error fetching predictions for date {target_date}: {e}")
            return []
    
    def update_prediction(self, game_id: str, prediction_data: Dict[str, Any]) -> bool:
        """Update an existing game's prediction.
        
        Args:
            game_id: NBA game ID
            prediction_data: Updated prediction data
            
        Returns:
            True if successful, False if game not found
        """
        try:
            logger.debug(f"Updating prediction for game {game_id}")
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    UPDATE games SET
                        prediction_rating = ?, 
                        updated_at = ?
                    WHERE id = ?
                """, (
                    prediction_data['rating'],
                    datetime.now(timezone.utc).isoformat(),
                    game_id
                ))
                
                rows_affected = cursor.rowcount
                conn.commit()
                
                if rows_affected > 0:
                    logger.info(f"Successfully updated prediction for game {game_id}")
                    return True
                else:
                    logger.warning(f"No existing game found to update for game {game_id}")
                    return False
                    
        except Exception as e:
            raise DatabaseError(f"Failed to update prediction for game {game_id}") from e
    
    def insert_game_if_not_exists(self, game_data: Dict[str, Any]) -> bool:
        """Insert a new game record if it doesn't exist.
        
        Args:
            game_data: Game data dictionary
            
        Returns:
            True if inserted, False if already exists
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if game exists
                cursor.execute("SELECT id FROM games WHERE id = ?", (game_data['game_id'],))
                
                if cursor.fetchone():
                    logger.debug(f"Game {game_data['game_id']} already exists")
                    return False
                
                # Insert new game without prediction data
                cursor.execute("""
                    INSERT INTO games (id, date, home_team_id, away_team_id)
                    VALUES (?, ?, ?, ?)
                """, (
                    game_data['game_id'],
                    game_data['date'],
                    game_data['home_team_id'],
                    game_data['away_team_id']
                ))
                
                conn.commit()
                logger.debug(f"Inserted new game record: {game_data['game_id']}")
                return True
                
        except Exception as e:
            logger.error(f"Error inserting game {game_data['game_id']}: {e}")
            return False
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics.
        
        Returns:
            Dictionary with database statistics
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Count total games
                cursor.execute("SELECT COUNT(*) FROM games")
                total_games = cursor.fetchone()[0]
                
                # Count games with predictions
                cursor.execute("SELECT COUNT(*) FROM games WHERE prediction_rating IS NOT NULL")
                games_with_predictions = cursor.fetchone()[0]
                
                # Get latest prediction date
                cursor.execute("""
                    SELECT MAX(date) FROM games 
                    WHERE prediction_rating IS NOT NULL
                """)
                latest_date = cursor.fetchone()[0]
                
                # Count teams
                cursor.execute("SELECT COUNT(*) FROM teams")
                total_teams = cursor.fetchone()[0]
                
                return {
                    "total_games": total_games,
                    "games_with_predictions": games_with_predictions,
                    "games_without_predictions": total_games - games_with_predictions,
                    "latest_prediction_date": latest_date,
                    "total_teams": total_teams,
                    "database_path": str(self.db_path)
                }
                
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {"error": str(e)}
    
    def backup_database(self) -> bool:
        """Create a backup of the database.
        
        Returns:
            True if backup successful, False otherwise
        """
        if not self.backup_enabled:
            logger.debug("Database backups are disabled")
            return True
        
        try:
            # Ensure backup directory exists
            self.backup_path.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = self.backup_path / f"nba_predictions_backup_{timestamp}.db"
            
            logger.info(f"Creating database backup: {backup_file}")
            
            # Copy database file
            import shutil
            shutil.copy2(self.db_path, backup_file)
            
            logger.info(f"Database backup created successfully: {backup_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create database backup: {e}")
            return False