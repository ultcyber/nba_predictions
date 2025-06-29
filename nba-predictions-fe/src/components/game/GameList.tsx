import React from 'react';
import type { Game } from '../../types/api';
import GameCard from './GameCard';

interface GameListProps {
  games: Game[];
  isLoading?: boolean;
  error?: Error | null;
  variant?: 'default' | 'compact';
}

const GameListSkeleton: React.FC = () => (
  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gray-200 animate-pulse h-16"></div>
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 p-4 sm:p-6 bg-gray-50">
          <div className="space-y-3">
            <div className="w-16 h-6 bg-gray-200 rounded-full mx-auto animate-pulse"></div>
            <div className="w-24 h-8 bg-gray-200 rounded mx-auto animate-pulse"></div>
            <div className="w-32 h-4 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ selectedDate: string }> = ({ selectedDate }) => (
  <div className="text-center py-12">
    <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No games scheduled</h3>
    <p className="text-gray-500 max-w-sm mx-auto">
      There are no NBA games scheduled for {new Date(selectedDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}. Try selecting a different date.
    </p>
  </div>
);

const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="text-center py-12">
    <div className="w-24 h-24 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
      <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load predictions</h3>
    <p className="text-gray-500 mb-4">
      There was an error loading the game predictions. Please check your connection and try again.
    </p>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="bg-nba-blue hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

const GameList: React.FC<GameListProps> = ({ games, isLoading, error, variant = 'default' }) => {
  if (isLoading) {
    return <GameListSkeleton />;
  }

  if (error) {
    return <ErrorState />;
  }

  if (!games || games.length === 0) {
    return <EmptyState selectedDate={new Date().toISOString().split('T')[0]} />;
  }

  // Sort games by classification: good -> mediocre -> bad
  const getClassificationPriority = (classification: string): number => {
    switch (classification) {
      case 'good': return 1;
      case 'mediocre': return 2;
      case 'bad': return 3;
      default: return 4;
    }
  };

  const sortedGames = [...games].sort((a, b) => {
    const priorityA = getClassificationPriority(a.prediction.classification);
    const priorityB = getClassificationPriority(b.prediction.classification);
    
    // If same classification, sort by rating (higher first)
    if (priorityA === priorityB) {
      return b.prediction.rating - a.prediction.rating;
    }
    
    return priorityA - priorityB;
  });

  const gridClasses = variant === 'compact' 
    ? 'space-y-2 sm:space-y-3' 
    : 'grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={gridClasses}>
      {sortedGames.map((game) => (
        <GameCard 
          key={game.id} 
          game={game} 
          variant={variant}
        />
      ))}
    </div>
  );
};

export default GameList;