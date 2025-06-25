import React from 'react';
import type { Game } from '../../types/api';
import ProbabilityBadge from './ProbabilityBadge';

interface GameCardProps {
  game: Game;
  variant?: 'default' | 'compact' | 'detailed';
}

const GameCard: React.FC<GameCardProps> = ({ game, variant = 'default' }) => {
  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {game.away_team.abbreviation} @ {game.home_team.abbreviation}
              </div>
              <div className="text-gray-500">{formatGameTime(game.date)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">{game.prediction.rating}</div>
            <div className="text-xs text-gray-500">rating</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Header with Date */}
      <div className="bg-gradient-to-r from-nba-blue to-blue-600 text-white px-6 py-3">
        <div className="text-center">
          <div className="text-sm font-medium opacity-90">{formatGameTime(game.date)}</div>
          <div className="text-xs opacity-75">NBA Game</div>
        </div>
      </div>

      {/* Team Matchup */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          {/* Away Team */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700">
                {game.away_team.abbreviation}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {game.away_team.name}
            </div>
            <div className="text-xs text-gray-500 mt-1">{game.away_team.conference}</div>
          </div>

          {/* VS Separator */}
          <div className="px-4">
            <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">@</span>
            </div>
          </div>

          {/* Home Team */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700">
                {game.home_team.abbreviation}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {game.home_team.name}
            </div>
            <div className="text-xs text-gray-500 mt-1">{game.home_team.conference}</div>
          </div>
        </div>
      </div>

      {/* Prediction Section */}
      <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
        <ProbabilityBadge prediction={game.prediction} size="medium" />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-3 bg-white">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Game ID: {game.id}</span>
          <span>NBA Prediction</span>
        </div>
      </div>
    </div>
  );
};

export default GameCard;