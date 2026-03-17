"""NBA data collection module using nba_api."""

import time
import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from random import randint
import traceback
import pandas as pd

from nba_api.stats.endpoints import (
    leaguegamefinder, 
    boxscoresummaryv3, 
    playbyplayv3,
    leaguestandingsv3
)
from nba_api.stats.static import teams
import requests

from .utils.config import settings
from .utils.logger import logger
from .utils.exceptions import DataCollectionError


class NBADataCollector:
    """Collects NBA game data from the official API."""

    def __init__(self, db_manager=None):
        """Initialize data collector.

        Args:
            db_manager: Optional DatabaseManager for rivalry score caching.
        """
        self.team_names = teams.get_teams()
        self.rate_limit_delay = settings.nba_api_rate_limit_delay
        self.retry_attempts = settings.nba_api_retry_attempts
        self.db_manager = db_manager
        
    def get_completed_games_for_date(self, target_date: date) -> List[Dict[str, Any]]:
        """Get all completed games for a specific date.
        
        Args:
            target_date: Date to fetch games for
            
        Returns:
            List of completed games with basic information
        """
        logger.info(f"Fetching completed games for {target_date}")
        
        try:
            # Convert date to NBA API format
            date_str = self._date_to_usa_format(target_date)
            
            # Find all games for the date
            gamefinder = leaguegamefinder.LeagueGameFinder(
                player_or_team_abbreviation="T",
                season_type_nullable="Regular Season",
                date_from_nullable=date_str,
                date_to_nullable=date_str
            )
            
            self._rate_limit_delay()
            games_df = gamefinder.get_data_frames()[0]
            
            if games_df.empty:
                logger.info(f"No games found for {target_date}")
                return []
            
            # Filter to get unique completed games (each game appears twice in the data)
            completed_games = []
            processed_game_ids = set()
            
            for _, game in games_df.iterrows():
                game_id = game['GAME_ID']
                
                if game_id in processed_game_ids:
                    continue
                    
                processed_game_ids.add(game_id)
                
                # Check if game is actually completed by fetching game details
                try:
                    game_details = self.fetch_game_details(game_id)
                    game_status = game_details.get('game_status', '')
                    
                    # Only include games with "Final" status
                    if not game_status.startswith('Final'):
                        logger.debug(f"Skipping game {game_id} with status: {game_status}")
                        continue
                        
                except Exception as e:
                    traceback.print_exception(e) 
                    logger.warning(f"Could not verify status for game {game_id}: {e}")
                    continue
                
                # Basic game information with details merged
                game_info = {
                    'game_id': game_id,
                    'date': target_date.isoformat(),
                    'home_team_id': None,  # Will be determined from matchup
                    'away_team_id': None,
                    'home_team_abbreviation': None,
                    'away_team_abbreviation': None,
                    'season_id': game['SEASON_ID']
                }
                
                # Merge game details (scores, lead changes, etc.)
                game_info.update(game_details)
                
                # Parse team information from matchup
                matchup = game['MATCHUP']  # Format: "LAL vs. BOS" or "LAL @ BOS"
                home_team_abbr, away_team_abbr = self._parse_matchup(matchup)
                
                game_info['home_team_abbreviation'] = home_team_abbr
                game_info['away_team_abbreviation'] = away_team_abbr
                
                # Get team IDs
                home_team = self._get_team_by_abbreviation(home_team_abbr)
                away_team = self._get_team_by_abbreviation(away_team_abbr)
                
                if home_team and away_team:
                    game_info['home_team_id'] = home_team['id']
                    game_info['away_team_id'] = away_team['id']
                    completed_games.append(game_info)
                
            logger.info(f"Found {len(completed_games)} completed games for {target_date}")
            return completed_games
            
        except Exception as e:
            raise DataCollectionError(f"Failed to fetch games for {target_date}") from e
    
    def fetch_game_details(self, game_id: str) -> Dict[str, Any]:
        """Fetch detailed information for a specific game.
        
        Args:
            game_id: NBA game ID
            
        Returns:
            Detailed game information
        """
        logger.debug(f"Fetching details for game {game_id}")
        
        try:
            # Get box score summary
            boxscore = self._retry_api_call(
                lambda: boxscoresummaryv3.BoxScoreSummaryV3(game_id=game_id)
            )
            
            dataframes = boxscore.get_data_frames()
            
            if not dataframes or len(dataframes) < 6:
                raise DataCollectionError(f"Incomplete boxscore data for game {game_id}")
            
            # Extract scores from DataFrame 5 which contains the PTS column
            scores_df = dataframes[4]  # Line score dataframe with final scores
            if scores_df.empty or 'score' not in scores_df.columns:
                raise DataCollectionError(f"No final scores found for game {game_id}")
            
            scores = scores_df['score'].tolist()
            if len(scores) < 2:
                raise DataCollectionError(f"Invalid score data for game {game_id}")
            
            logger.debug(f"Scores: {scores}")
            home_score = int(scores[0])  # First row is home team
            away_score = int(scores[1])  # Second row is away team
            
            # Get other stats (lead changes, etc.)
            other_stats = dataframes[7].iloc[0] if len(dataframes) > 1 and not dataframes[7].empty else {}
            game_summary = dataframes[0].iloc[0] if len(dataframes) > 0 and not dataframes[0].empty else {}
            
            # Extract relevant information
            game_details = {
                'game_id': game_id,
                'home_team_score': int(home_score),
                'away_team_score': int(away_score),
                'lead_changes': int(other_stats.get('leadChanges')),
                'times_tied': int(other_stats.get('timesTied')),
                'game_status': game_summary.get('gameStatusText'),
                'attendance': game_summary.get('attendance')
            }
            
            return game_details
            
        except Exception as e:
            raise DataCollectionError(f"Failed to fetch game details for {game_id} : {e}") from e
    
    def _parse_clock(self,clock_str):
        match = re.search('(?P<minutes>[0-9]{2})M(?P<seconds>[0-9]{2})', clock_str)
        minutes = match.group('minutes')
        seconds = match.group('seconds')
        return int(minutes)*60+int(seconds)


    def calculate_competitive_seconds(self, game_id: str) -> float:
        """Calculate seconds when the game was competitive (within 5 points).
        
        Args:
            game_id: NBA game ID
            
        Returns:
            Total seconds when game was within 5 points
        """
        logger.debug(f"Calculating competitive seconds for game {game_id}")
        
        try:
            pbp_data = self._retry_api_call(
                lambda: playbyplayv3.PlayByPlayV3(game_id=game_id)
            )

            df = pbp_data.play_by_play.get_data_frame()
            
            if df.empty:
                raise DataCollectionError(f"No play-by-play data available for game {game_id}")
            
            # Sort by time remaining (descending)
            df['SECONDS_REMAINING'] = df['clock'].apply(self._parse_clock)
            df['scoreHome'] = pd.to_numeric(df['scoreHome'], errors='coerce')
            df['scoreAway'] = pd.to_numeric(df['scoreAway'], errors='coerce')
            df['HOME_SCORE_MARGIN'] = abs(df['scoreHome'] - df['scoreAway'])

            
            df = df.sort_values(by='SECONDS_REMAINING', ascending=False).reset_index(drop=True)
            
            # Calculate time differences
            df['TIME_DIFF'] = df['SECONDS_REMAINING'].diff().shift(-1).fillna(0)
            df['TIME_DIFF'] = abs(df['TIME_DIFF'])
            
            # Filter for competitive moments (within 5 points)
            competitive_df = df[abs(df['HOME_SCORE_MARGIN']) <= 5]
            
            total_seconds = competitive_df['TIME_DIFF'].sum()
            return float(total_seconds) if total_seconds else 0.0
            
        except Exception as e:
            traceback.print_exception(e)
            raise DataCollectionError(f"Error calculating competitive seconds for {game_id}: {e}") from e
    
    def calculate_rivalry_score(self, home_team_id: int, away_team_id: int, game_date: date) -> float:
        """Calculate rivalry score based on recent playoff meetings and close games.

        Uses a DB-first approach: if rivalry data for the team pair already exists in
        the local cache, the NBA API is skipped entirely.  On the first call for a pair
        the 5-year history is fetched from the NBA API and stored for future runs.

        Args:
            home_team_id: Home team ID
            away_team_id: Away team ID
            game_date: Date of the game

        Returns:
            Rivalry score (0.0 to 1.0+)
        """
        logger.debug(f"Calculating rivalry score between teams {home_team_id} and {away_team_id}")

        try:
            five_years_ago = date(game_date.year - 5, game_date.month, game_date.day)
            five_years_ago_str = five_years_ago.isoformat()

            t1, t2 = tuple(sorted([str(home_team_id), str(away_team_id)]))

            if self.db_manager is not None and self.db_manager.pair_exists_in_rivalry_cache(t1, t2):
                logger.info(f"Using cached rivalry data for teams {t1} vs {t2}")
                rows = self.db_manager.get_rivalry_games(t1, t2, five_years_ago_str)
            else:
                # Initial seed: fetch full 5-year history from NBA API
                logger.info(f"No rivalry cache for teams {t1} vs {t2} — seeding from NBA API")
                playoff_rows = self._get_games_between_teams(
                    home_team_id, away_team_id, five_years_ago, game_date, "Playoffs"
                )
                regular_rows = self._get_games_between_teams(
                    home_team_id, away_team_id, five_years_ago, game_date, "Regular Season"
                )
                rows = playoff_rows + regular_rows

                if self.db_manager is not None and rows:
                    self.db_manager.save_rivalry_games_bulk(t1, t2, rows)

            # Compute score from local rows
            playoff_games = [r for r in rows if r['season_type'] == 'Playoffs']
            regular_games = [r for r in rows if r['season_type'] == 'Regular Season']

            total_regular = len(regular_games)
            if total_regular == 0:
                close_ratio = 0.0
            else:
                close_games = [r for r in regular_games if abs(r['point_diff']) <= 10]
                close_ratio = len(close_games) / total_regular

            rivalry_score = len(playoff_games) * 0.7 + close_ratio * 0.3
            return float(rivalry_score)

        except Exception as e:
            raise DataCollectionError(f"Error calculating rivalry score: {e}") from e
    
    def get_team_standings(self, target_date: date) -> Dict[int, Dict[str, Any]]:
        """Get team standings for ranking calculations.
        
        Args:
            target_date: Date to get standings for
            
        Returns:
            Dictionary mapping team_id to standing information
        """
        logger.debug(f"Fetching team standings for {target_date}")
        
        try:
            # Determine season for the date
            season = self._get_season_for_date(target_date)
            
            standings = self._retry_api_call(
                lambda: leaguestandingsv3.LeagueStandingsV3(
                    season=season,
                    season_type="Regular Season"
                )
            )
            
            standings_df = standings.get_data_frames()[0]
            
            team_standings = {}
            for _, team in standings_df.iterrows():
                team_standings[team['TeamID']] = {
                    'conference_rank': team.get('ConferenceRank', team.get('CONFERENCE_RANK', 1)),
                    'league_rank': team.get('LeagueRank', team.get('LEAGUE_RANK', 1)),
                    'wins': team.get('WINS', team.get('W', 0)),
                    'losses': team.get('LOSSES', team.get('L', 0)),
                    'win_pct': team.get('WinPCT', team.get('W_PCT', 0.5)),
                    'conference': team.get('Conference', team.get('CONFERENCE', 'Unknown'))
                }
            
            return team_standings
            
        except Exception as e:
            raise DataCollectionError(f"Error fetching team standings: {e}") from e
    
    def _retry_api_call(self, api_func):
        """Retry API call with exponential backoff."""
        for attempt in range(self.retry_attempts):
            try:
                self._rate_limit_delay()
                return api_func()
            except requests.exceptions.RequestException as e:
                if attempt == self.retry_attempts - 1:
                    raise e
                
                wait_time = (attempt + 1) * 15 + randint(0, 14)
                logger.warning(f"API call failed, retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
    
    def _rate_limit_delay(self):
        """Add delay to respect API rate limits."""
        time.sleep(self.rate_limit_delay)
    
    def _date_to_usa_format(self, date_obj: date) -> str:
        """Convert date to USA format (MM/DD/YYYY)."""
        return date_obj.strftime("%m/%d/%Y")
    
    def _parse_matchup(self, matchup: str) -> tuple[str, str]:
        """Parse matchup string to get home and away team abbreviations.
        
        Args:
            matchup: Matchup string like "LAL vs. BOS" or "LAL @ BOS"
            
        Returns:
            Tuple of (home_team_abbr, away_team_abbr)
        """
        if " vs. " in matchup:
            # Home game format: "LAL vs. BOS" (LAL is home)
            parts = matchup.split(" vs. ")
            return parts[0], parts[1]
        elif " @ " in matchup:
            # Away game format: "LAL @ BOS" (BOS is home)
            parts = matchup.split(" @ ")
            return parts[1], parts[0]
        else:
            raise DataCollectionError(f"Unable to parse matchup: {matchup}")
    
    def _get_team_by_abbreviation(self, abbreviation: str) -> Optional[Dict]:
        """Get team info by abbreviation."""
        for team in self.team_names:
            if team['abbreviation'] == abbreviation:
                return team
        return None
    
    def _get_games_between_teams(
        self,
        team1_id: int,
        team2_id: int,
        start_date: date,
        end_date: date,
        season_type: str,
    ) -> List[Dict[str, Any]]:
        """Get games between two teams in a date range.

        Returns:
            List of dicts with keys: game_date (YYYY-MM-DD), season_type, point_diff
        """
        try:
            gamefinder = leaguegamefinder.LeagueGameFinder(
                player_or_team_abbreviation="T",
                team_id_nullable=team1_id,
                vs_team_id_nullable=team2_id,
                season_type_nullable=season_type,
                date_from_nullable=self._date_to_usa_format(start_date),
                date_to_nullable=self._date_to_usa_format(end_date)
            )

            self._rate_limit_delay()
            games_df = gamefinder.get_data_frames()[0]

            if games_df.empty:
                return []

            rows = []
            for _, row in games_df.iterrows():
                rows.append({
                    'game_date': str(row['GAME_DATE']),
                    'season_type': season_type,
                    'point_diff': int(row['PLUS_MINUS']),
                })
            return rows

        except Exception as e:
            raise DataCollectionError(
                f"Error fetching {season_type} games between teams {team1_id} and {team2_id}: {e}"
            ) from e
    
    def _get_season_for_date(self, target_date: date) -> str:
        """Get NBA season string for a given date."""
        # NBA season spans two calendar years
        # Season 2023-24 runs from Oct 2023 to June 2024
        if target_date.month >= 10:
            # October-December: start of season
            season_start = target_date.year
        else:
            # January-September: end of season
            season_start = target_date.year - 1
        
        return f"{season_start}-{str(season_start + 1)[2:]}"