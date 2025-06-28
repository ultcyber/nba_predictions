"""NBA data collection module using nba_api."""

import time
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from random import randint

from nba_api.stats.endpoints import (
    leaguegamefinder, 
    boxscoresummaryv2, 
    winprobabilitypbp,
    leaguestandingsv3
)
from nba_api.stats.static import teams
import requests

from .utils.config import settings
from .utils.logger import logger
from .utils.exceptions import DataCollectionError


class NBADataCollector:
    """Collects NBA game data from the official API."""
    
    def __init__(self):
        """Initialize data collector."""
        self.team_names = teams.get_teams()
        self.rate_limit_delay = settings.nba_api.rate_limit_delay
        self.retry_attempts = settings.nba_api.retry_attempts
        
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
            
            # Filter to get unique games (each game appears twice in the data)
            completed_games = []
            processed_game_ids = set()
            
            for _, game in games_df.iterrows():
                game_id = game['GAME_ID']
                
                if game_id in processed_game_ids:
                    continue
                    
                processed_game_ids.add(game_id)
                
                # Basic game information
                game_info = {
                    'game_id': game_id,
                    'date': target_date.isoformat(),
                    'home_team_id': None,  # Will be determined from matchup
                    'away_team_id': None,
                    'home_team_abbreviation': None,
                    'away_team_abbreviation': None,
                    'season_id': game['SEASON_ID']
                }
                
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
            logger.error(f"Error fetching games for {target_date}: {e}")
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
                lambda: boxscoresummaryv2.BoxScoreSummaryV2(game_id=game_id)
            )
            
            dataframes = boxscore.get_data_frames()
            
            if not dataframes or len(dataframes) < 2:
                raise DataCollectionError(f"Incomplete boxscore data for game {game_id}")
            
            game_summary = dataframes[0].iloc[0]
            other_stats = dataframes[1].iloc[0]
            
            # Log available columns for debugging
            logger.debug(f"Game summary columns: {list(game_summary.index)}")
            logger.debug(f"Other stats columns: {list(other_stats.index)}")
            
            # Extract relevant information
            game_details = {
                'game_id': game_id,
                'home_team_score': int(game_summary.get('HOME_TEAM_PTS', game_summary.get('PTS_HOME', 0))),
                'away_team_score': int(game_summary.get('VISITOR_TEAM_PTS', game_summary.get('PTS_AWAY', 0))),
                'lead_changes': int(other_stats.get('LEAD_CHANGES', 0)),
                'times_tied': int(other_stats.get('TIMES_TIED', 0)),
                'game_status': game_summary.get('GAME_STATUS_TEXT', 'Final'),
                'attendance': game_summary.get('ATTENDANCE', 0)
            }
            
            return game_details
            
        except Exception as e:
            logger.error(f"Error fetching game details for {game_id}: {e}")
            raise DataCollectionError(f"Failed to fetch game details for {game_id}") from e
    
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
                lambda: winprobabilitypbp.WinProbabilityPBP(game_id=game_id)
            )
            
            df = pbp_data.get_data_frames()[0]
            
            if df.empty:
                logger.warning(f"No play-by-play data for game {game_id}")
                return 0.0
            
            # Sort by time remaining (descending)
            df = df.sort_values(by='SECONDS_REMAINING', ascending=False).reset_index(drop=True)
            
            # Calculate time differences
            df['TIME_DIFF'] = df['SECONDS_REMAINING'].diff().shift(-1).fillna(0)
            df['TIME_DIFF'] = abs(df['TIME_DIFF'])
            
            # Filter for competitive moments (within 5 points)
            competitive_df = df[abs(df['HOME_SCORE_MARGIN']) <= 5]
            
            total_seconds = competitive_df['TIME_DIFF'].sum()
            return float(total_seconds) if total_seconds else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating competitive seconds for {game_id}: {e}")
            return 0.0  # Return 0 instead of failing completely
    
    def calculate_rivalry_score(self, home_team_id: int, away_team_id: int, game_date: date) -> float:
        """Calculate rivalry score based on recent playoff meetings and close games.
        
        Args:
            home_team_id: Home team ID
            away_team_id: Away team ID
            game_date: Date of the game
            
        Returns:
            Rivalry score (0.0 to 1.0+)
        """
        logger.debug(f"Calculating rivalry score between teams {home_team_id} and {away_team_id}")
        
        try:
            # Calculate date 5 years ago
            five_years_ago = date(game_date.year - 5, game_date.month, game_date.day)
            
            # Get playoff games between teams in last 5 years
            playoff_games = self._get_games_between_teams(
                home_team_id, away_team_id, five_years_ago, game_date, "Playoffs"
            )
            
            # Get regular season games for close game analysis
            regular_games = self._get_games_between_teams(
                home_team_id, away_team_id, five_years_ago, game_date, "Regular Season"
            )
            
            if not regular_games:
                return 0.0
            
            # Calculate close games ratio (within 10 points)
            close_games = [game for game in regular_games if abs(game) <= 10]
            close_games_ratio = len(close_games) / len(regular_games) if regular_games else 0
            
            # Rivalry score formula: playoff games weight + close games ratio weight
            rivalry_score = len(playoff_games) * 0.7 + close_games_ratio * 0.3
            
            return float(rivalry_score)
            
        except Exception as e:
            logger.error(f"Error calculating rivalry score: {e}")
            return 0.0  # Return 0 instead of failing
    
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
            
            # Log available columns for debugging
            logger.debug(f"Standings columns: {list(standings_df.columns)}")
            
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
            logger.error(f"Error fetching team standings: {e}")
            return {}
    
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
        season_type: str
    ) -> List[int]:
        """Get games between two teams in a date range."""
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
            
            return games_df['PLUS_MINUS'].tolist()
            
        except Exception as e:
            logger.error(f"Error fetching games between teams: {e}")
            return []
    
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