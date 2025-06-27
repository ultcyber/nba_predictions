"""Feature engineering module to transform NBA data into model features."""

from datetime import date
from typing import Dict, Any
import pandas as pd

from .data_collector import NBADataCollector
from .utils.config import settings
from .utils.logger import logger
from .utils.exceptions import FeatureEngineeringError


class FeatureEngineer:
    """Transforms raw NBA data into features matching the training dataset."""
    
    def __init__(self, data_collector: NBADataCollector):
        """Initialize feature engineer.
        
        Args:
            data_collector: NBA data collector instance
        """
        self.data_collector = data_collector
        
    def extract_features(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract all features for a single game.
        
        Args:
            game_data: Raw game data from data collector
            
        Returns:
            Dictionary of features matching training schema
            
        Raises:
            FeatureEngineeringError: If any feature calculation fails
        """
        logger.debug(f"Extracting features for game {game_data['game_id']}")
        
        # Basic game information - validate required fields exist
        game_id = self._get_required_field(game_data, 'game_id', 'Game ID missing')
        home_team_id = self._get_required_field(game_data, 'home_team_id', 'Home team ID missing')
        away_team_id = self._get_required_field(game_data, 'away_team_id', 'Away team ID missing')
        game_date = date.fromisoformat(self._get_required_field(game_data, 'date', 'Game date missing'))
        
        # Get team standings - required for most features
        standings = self.data_collector.get_team_standings(game_date)
        if not standings:
            raise FeatureEngineeringError(f"No standings data available for {game_date}")
        
        # Calculate all features - any failure will stop execution
        features = {
            'diff_ranks': self._calculate_diff_ranks(home_team_id, away_team_id, standings),
            'inter_conference': self._calculate_inter_conference(home_team_id, away_team_id, standings),
            'scores_diff': self._calculate_scores_diff(game_data),
            'position_score': self._calculate_position_score(home_team_id, away_team_id, standings),
            'competitive_seconds': self._get_competitive_seconds(game_id),
            'lead_changes': self._get_lead_changes(game_data),
            'rivalry_score': self._get_rivalry_score(home_team_id, away_team_id, game_date)
        }
        
        # Validate feature schema
        self._validate_features(features)
        
        logger.info(f"Successfully extracted features for game {game_id}")
        logger.debug(f"Features: {features}")
        return features
    
    def _get_required_field(self, data: Dict[str, Any], field: str, error_msg: str) -> Any:
        """Get required field from data dictionary.
        
        Args:
            data: Data dictionary
            field: Field name to extract
            error_msg: Error message if field missing
            
        Returns:
            Field value
            
        Raises:
            FeatureEngineeringError: If field is missing or None
        """
        if field not in data or data[field] is None:
            raise FeatureEngineeringError(f"{error_msg}: {field}")
        return data[field]
    
    def _calculate_diff_ranks(
        self, 
        home_team_id: int, 
        away_team_id: int, 
        standings: Dict[int, Dict[str, Any]]
    ) -> int:
        """Calculate difference in team rankings.
        
        Args:
            home_team_id: Home team ID
            away_team_id: Away team ID  
            standings: Team standings data
            
        Returns:
            Absolute difference in conference rankings
            
        Raises:
            FeatureEngineeringError: If standings data missing for either team
        """
        if home_team_id not in standings:
            raise FeatureEngineeringError(f"No standings data for home team {home_team_id}")
        
        if away_team_id not in standings:
            raise FeatureEngineeringError(f"No standings data for away team {away_team_id}")
        
        home_rank = standings[home_team_id]['conference_rank']
        away_rank = standings[away_team_id]['conference_rank']
        
        if home_rank is None or away_rank is None:
            raise FeatureEngineeringError(f"Invalid conference rank data: home={home_rank}, away={away_rank}")
        
        return abs(int(home_rank) - int(away_rank))
    
    def _calculate_inter_conference(
        self, 
        home_team_id: int, 
        away_team_id: int, 
        standings: Dict[int, Dict[str, Any]]
    ) -> int:
        """Calculate if game is inter-conference (East vs West).
        
        Args:
            home_team_id: Home team ID
            away_team_id: Away team ID
            standings: Team standings data
            
        Returns:
            1 if inter-conference game, 0 if same conference
            
        Raises:
            FeatureEngineeringError: If conference data missing
        """
        if home_team_id not in standings:
            raise FeatureEngineeringError(f"No standings data for home team {home_team_id}")
        
        if away_team_id not in standings:
            raise FeatureEngineeringError(f"No standings data for away team {away_team_id}")
        
        home_conf = standings[home_team_id]['conference']
        away_conf = standings[away_team_id]['conference']
        
        if not home_conf or not away_conf:
            raise FeatureEngineeringError(f"Missing conference data: home={home_conf}, away={away_conf}")
        
        return 1 if home_conf != away_conf else 0
    
    def _calculate_scores_diff(self, game_data: Dict[str, Any]) -> int:
        """Calculate final score difference.
        
        Args:
            game_data: Game data with scores
            
        Returns:
            Absolute score difference
            
        Raises:
            FeatureEngineeringError: If score data missing or invalid
        """
        home_score = self._get_required_field(game_data, 'home_team_score', 'Home team score missing')
        away_score = self._get_required_field(game_data, 'away_team_score', 'Away team score missing')
        
        try:
            home_score = int(home_score)
            away_score = int(away_score)
        except (ValueError, TypeError) as e:
            raise FeatureEngineeringError(f"Invalid score data: home={home_score}, away={away_score}") from e
        
        if home_score < 0 or away_score < 0:
            raise FeatureEngineeringError(f"Negative scores not allowed: home={home_score}, away={away_score}")
        
        return abs(home_score - away_score)
    
    def _calculate_position_score(
        self, 
        home_team_id: int, 
        away_team_id: int, 
        standings: Dict[int, Dict[str, Any]]
    ) -> float:
        """Calculate position strength score based on team standings.
        
        Args:
            home_team_id: Home team ID
            away_team_id: Away team ID
            standings: Team standings data
            
        Returns:
            Position score (0.0 to 1.0+)
            
        Raises:
            FeatureEngineeringError: If required standings data missing
        """
        if home_team_id not in standings:
            raise FeatureEngineeringError(f"No standings data for home team {home_team_id}")
        
        if away_team_id not in standings:
            raise FeatureEngineeringError(f"No standings data for away team {away_team_id}")
        
        home_standing = standings[home_team_id]
        away_standing = standings[away_team_id]
        
        # Validate required fields
        required_fields = ['win_pct', 'conference_rank']
        for field in required_fields:
            if field not in home_standing or home_standing[field] is None:
                raise FeatureEngineeringError(f"Missing {field} for home team {home_team_id}")
            if field not in away_standing or away_standing[field] is None:
                raise FeatureEngineeringError(f"Missing {field} for away team {away_team_id}")
        
        home_win_pct = float(home_standing['win_pct'])
        away_win_pct = float(away_standing['win_pct'])
        home_conf_rank = int(home_standing['conference_rank'])
        away_conf_rank = int(away_standing['conference_rank'])
        
        # Validate ranges
        if not (0 <= home_win_pct <= 1):
            raise FeatureEngineeringError(f"Invalid home team win percentage: {home_win_pct}")
        if not (0 <= away_win_pct <= 1):
            raise FeatureEngineeringError(f"Invalid away team win percentage: {away_win_pct}")
        if not (1 <= home_conf_rank <= 15):
            raise FeatureEngineeringError(f"Invalid home team conference rank: {home_conf_rank}")
        if not (1 <= away_conf_rank <= 15):
            raise FeatureEngineeringError(f"Invalid away team conference rank: {away_conf_rank}")
        
        # Calculate position scores
        home_score = home_win_pct + (16 - home_conf_rank) / 15
        away_score = away_win_pct + (16 - away_conf_rank) / 15
        
        total_score = home_score + away_score
        if total_score == 0:
            raise FeatureEngineeringError("Total position score is zero - invalid standings data")
        
        position_score = home_score / total_score
        return round(position_score, 6)
    
    def _get_competitive_seconds(self, game_id: str) -> float:
        """Get competitive seconds from data collector.
        
        Args:
            game_id: NBA game ID
            
        Returns:
            Seconds when game was within 5 points
            
        Raises:
            FeatureEngineeringError: If calculation fails
        """
        try:
            competitive_seconds = self.data_collector.calculate_competitive_seconds(game_id)
            if competitive_seconds is None:
                raise FeatureEngineeringError(f"Failed to calculate competitive seconds for game {game_id}")
            
            competitive_seconds = float(competitive_seconds)
            if competitive_seconds < 0:
                raise FeatureEngineeringError(f"Negative competitive seconds: {competitive_seconds}")
            
            return competitive_seconds
            
        except Exception as e:
            if isinstance(e, FeatureEngineeringError):
                raise
            raise FeatureEngineeringError(f"Error calculating competitive seconds for {game_id}") from e
    
    def _get_lead_changes(self, game_data: Dict[str, Any]) -> int:
        """Get lead changes from game data.
        
        Args:
            game_data: Game data with lead changes
            
        Returns:
            Number of lead changes
            
        Raises:
            FeatureEngineeringError: If lead changes data invalid
        """
        lead_changes = self._get_required_field(game_data, 'lead_changes', 'Lead changes data missing')
        
        try:
            lead_changes = int(lead_changes)
        except (ValueError, TypeError) as e:
            raise FeatureEngineeringError(f"Invalid lead changes data: {lead_changes}") from e
        
        if lead_changes < 0:
            raise FeatureEngineeringError(f"Negative lead changes not allowed: {lead_changes}")
        
        return lead_changes
    
    def _get_rivalry_score(self, home_team_id: int, away_team_id: int, game_date: date) -> float:
        """Get rivalry score from data collector.
        
        Args:
            home_team_id: Home team ID
            away_team_id: Away team ID
            game_date: Date of the game
            
        Returns:
            Rivalry score based on historical matchups
            
        Raises:
            FeatureEngineeringError: If calculation fails
        """
        try:
            rivalry_score = self.data_collector.calculate_rivalry_score(home_team_id, away_team_id, game_date)
            if rivalry_score is None:
                raise FeatureEngineeringError(f"Failed to calculate rivalry score for teams {home_team_id} vs {away_team_id}")
            
            rivalry_score = float(rivalry_score)
            if rivalry_score < 0:
                raise FeatureEngineeringError(f"Negative rivalry score: {rivalry_score}")
            
            return rivalry_score
            
        except Exception as e:
            if isinstance(e, FeatureEngineeringError):
                raise
            raise FeatureEngineeringError(f"Error calculating rivalry score") from e
    
    def _validate_features(self, features: Dict[str, Any]) -> None:
        """Validate that features match expected schema.
        
        Args:
            features: Feature dictionary to validate
            
        Raises:
            FeatureEngineeringError: If features don't match schema
        """
        expected_features = {
            'diff_ranks': int,
            'inter_conference': int,
            'scores_diff': int,
            'position_score': float,
            'competitive_seconds': float,
            'lead_changes': int,
            'rivalry_score': float
        }
        
        # Check all required features are present
        missing_features = set(expected_features.keys()) - set(features.keys())
        if missing_features:
            raise FeatureEngineeringError(f"Missing features: {missing_features}")
        
        # Check feature types
        for feature_name, expected_type in expected_features.items():
            if not isinstance(features[feature_name], expected_type):
                actual_type = type(features[feature_name])
                raise FeatureEngineeringError(
                    f"Feature {feature_name} has wrong type: expected {expected_type}, got {actual_type}"
                )
        
        # Check value constraints
        if features['inter_conference'] not in [0, 1]:
            raise FeatureEngineeringError(f"inter_conference must be 0 or 1, got {features['inter_conference']}")
        
        if features['diff_ranks'] < 0:
            raise FeatureEngineeringError(f"diff_ranks cannot be negative: {features['diff_ranks']}")
        
        if features['scores_diff'] < 0:
            raise FeatureEngineeringError(f"scores_diff cannot be negative: {features['scores_diff']}")
        
        if features['position_score'] < 0 or features['position_score'] > 2:
            raise FeatureEngineeringError(f"position_score outside valid range [0, 2]: {features['position_score']}")
        
        if features['competitive_seconds'] < 0:
            raise FeatureEngineeringError(f"competitive_seconds cannot be negative: {features['competitive_seconds']}")
        
        if features['lead_changes'] < 0:
            raise FeatureEngineeringError(f"lead_changes cannot be negative: {features['lead_changes']}")
        
        if features['rivalry_score'] < 0:
            raise FeatureEngineeringError(f"rivalry_score cannot be negative: {features['rivalry_score']}")
    
    def features_to_dataframe(self, features: Dict[str, Any]) -> pd.DataFrame:
        """Convert features dictionary to pandas DataFrame for model input.
        
        Args:
            features: Feature dictionary
            
        Returns:
            Single-row DataFrame with features in correct order
            
        Raises:
            FeatureEngineeringError: If DataFrame creation fails
        """
        # Ensure features are in the correct order for the model
        feature_order = [
            'diff_ranks',
            'inter_conference', 
            'scores_diff',
            'position_score',
            'competitive_seconds',
            'lead_changes',
            'rivalry_score'
        ]
        
        try:
            # Create DataFrame with single row
            df_data = {feature: [features[feature]] for feature in feature_order}
            df = pd.DataFrame(df_data)
            
            logger.debug(f"Created DataFrame with shape {df.shape}")
            return df
            
        except Exception as e:
            raise FeatureEngineeringError(f"Failed to create DataFrame from features") from e
    
    def create_feature_summary(self, features: Dict[str, Any]) -> str:
        """Create human-readable summary of features.
        
        Args:
            features: Feature dictionary
            
        Returns:
            Formatted summary string
        """
        summary_lines = [
            "Feature Summary:",
            f"  Rank Difference: {features['diff_ranks']}",
            f"  Inter-Conference: {'Yes' if features['inter_conference'] else 'No'}",
            f"  Score Difference: {features['scores_diff']} points",
            f"  Position Score: {features['position_score']:.6f}",
            f"  Competitive Time: {features['competitive_seconds']:.0f} seconds",
            f"  Lead Changes: {features['lead_changes']}",
            f"  Rivalry Score: {features['rivalry_score']:.6f}"
        ]
        
        return "\n".join(summary_lines)