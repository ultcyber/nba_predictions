import React from 'react';
import type { Team } from '../../types/api';

interface TeamLogoProps {
  team: Team;
  size?: 'small' | 'medium' | 'large';
  variant?: 'circle' | 'square' | 'hexagon';
}

const TeamLogo: React.FC<TeamLogoProps> = ({ team, size = 'medium', variant = 'circle' }) => {
  // Generate team colors based on abbreviation for consistency
  const getTeamColors = (abbreviation: string): { bg: string; text: string; accent: string } => {
    const colorMap: { [key: string]: { bg: string; text: string; accent: string } } = {
      // Eastern Conference
      'ATL': { bg: 'from-red-600 to-red-800', text: 'text-white', accent: 'ring-red-500' },
      'BOS': { bg: 'from-green-600 to-green-800', text: 'text-white', accent: 'ring-green-500' },
      'BRK': { bg: 'from-gray-800 to-black', text: 'text-white', accent: 'ring-gray-600' },
      'CHA': { bg: 'from-teal-500 to-teal-700', text: 'text-white', accent: 'ring-teal-400' },
      'CHI': { bg: 'from-red-600 to-red-800', text: 'text-white', accent: 'ring-red-500' },
      'CLE': { bg: 'from-yellow-600 to-yellow-800', text: 'text-white', accent: 'ring-yellow-500' },
      'DET': { bg: 'from-red-600 to-blue-600', text: 'text-white', accent: 'ring-red-500' },
      'IND': { bg: 'from-yellow-500 to-blue-600', text: 'text-white', accent: 'ring-yellow-400' },
      'MIA': { bg: 'from-red-600 to-black', text: 'text-white', accent: 'ring-red-500' },
      'MIL': { bg: 'from-green-700 to-green-900', text: 'text-white', accent: 'ring-green-600' },
      'NYK': { bg: 'from-blue-600 to-orange-500', text: 'text-white', accent: 'ring-blue-500' },
      'ORL': { bg: 'from-blue-600 to-blue-800', text: 'text-white', accent: 'ring-blue-500' },
      'PHI': { bg: 'from-blue-600 to-red-600', text: 'text-white', accent: 'ring-blue-500' },
      'TOR': { bg: 'from-red-600 to-purple-600', text: 'text-white', accent: 'ring-red-500' },
      'WAS': { bg: 'from-red-600 to-blue-600', text: 'text-white', accent: 'ring-red-500' },
      
      // Western Conference
      'DAL': { bg: 'from-blue-600 to-blue-800', text: 'text-white', accent: 'ring-blue-500' },
      'DEN': { bg: 'from-blue-600 to-yellow-500', text: 'text-white', accent: 'ring-blue-500' },
      'GSW': { bg: 'from-blue-600 to-yellow-400', text: 'text-white', accent: 'ring-blue-500' },
      'HOU': { bg: 'from-red-600 to-red-800', text: 'text-white', accent: 'ring-red-500' },
      'LAC': { bg: 'from-blue-600 to-red-600', text: 'text-white', accent: 'ring-blue-500' },
      'LAL': { bg: 'from-purple-600 to-yellow-500', text: 'text-white', accent: 'ring-purple-500' },
      'MEM': { bg: 'from-blue-600 to-teal-600', text: 'text-white', accent: 'ring-blue-500' },
      'MIN': { bg: 'from-blue-600 to-green-600', text: 'text-white', accent: 'ring-blue-500' },
      'NOP': { bg: 'from-blue-600 to-yellow-600', text: 'text-white', accent: 'ring-blue-500' },
      'OKC': { bg: 'from-blue-600 to-orange-500', text: 'text-white', accent: 'ring-blue-500' },
      'PHX': { bg: 'from-orange-500 to-purple-600', text: 'text-white', accent: 'ring-orange-400' },
      'POR': { bg: 'from-red-600 to-black', text: 'text-white', accent: 'ring-red-500' },
      'SAC': { bg: 'from-purple-600 to-purple-800', text: 'text-white', accent: 'ring-purple-500' },
      'SAS': { bg: 'from-gray-700 to-black', text: 'text-white', accent: 'ring-gray-500' },
      'UTA': { bg: 'from-blue-600 to-yellow-500', text: 'text-white', accent: 'ring-blue-500' },
    };

    return colorMap[abbreviation] || { bg: 'from-gray-500 to-gray-700', text: 'text-white', accent: 'ring-gray-400' };
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-8 h-8 text-xs';
      case 'large':
        return 'w-16 h-16 text-lg';
      default:
        return 'w-12 h-12 text-sm';
    }
  };

  const getShapeClasses = () => {
    switch (variant) {
      case 'square':
        return 'rounded-lg';
      case 'hexagon':
        return 'rounded-lg transform rotate-45'; // Simplified hexagon effect
      default:
        return 'rounded-full';
    }
  };

  const colors = getTeamColors(team.abbreviation);

  return (
    <div className="flex flex-col items-center space-y-1">
      {/* Logo Container */}
      <div 
        className={`
          ${getSizeClasses()} 
          ${getShapeClasses()}
          bg-gradient-to-br ${colors.bg}
          ${colors.text}
          flex items-center justify-center
          font-bold
          shadow-lg
          ring-2 ${colors.accent} ring-opacity-50
          transition-all duration-200
          hover:scale-110 hover:shadow-xl
          relative
          overflow-hidden
        `}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-gradient-to-br from-white to-transparent"></div>
        </div>
        
        {/* Abbreviation Text */}
        <span className="relative z-10 font-extrabold tracking-tight">
          {team.abbreviation}
        </span>
      </div>

      {/* Conference Badge */}
      {size !== 'small' && (
        <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          team.conference === 'East' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {team.conference}
        </div>
      )}
    </div>
  );
};

export default TeamLogo;