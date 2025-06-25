import React from 'react';
import type { GamePrediction } from '../../types/api';

interface ProbabilityBadgeProps {
  prediction: GamePrediction;
  size?: 'small' | 'medium' | 'large';
}

const ProbabilityBadge: React.FC<ProbabilityBadgeProps> = ({ prediction, size = 'medium' }) => {
  const getClassificationColors = (classification: string) => {
    switch (classification) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'bad':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColors = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-xs px-2 py-1';
      case 'large':
        return 'text-lg px-4 py-2';
      default:
        return 'text-sm px-3 py-1';
    }
  };

  const getRatingDisplay = () => {
    if (size === 'large') {
      return 'text-3xl font-bold';
    }
    return size === 'small' ? 'text-lg font-semibold' : 'text-2xl font-bold';
  };

  return (
    <div className="text-center space-y-2">
      {/* Classification Badge */}
      <div className="flex justify-center">
        <span className={`inline-flex items-center rounded-full border font-medium ${getSizeClasses()} ${getClassificationColors(prediction.classification)}`}>
          {prediction.classification.toUpperCase()}
        </span>
      </div>

      {/* Rating Display */}
      <div className={`${getRatingDisplay()} text-gray-900`}>
        {prediction.rating}<span className="text-gray-500 text-base">/100</span>
      </div>

      {/* Probability and Confidence */}
      <div className="space-y-1">
        <div className="text-sm text-gray-600">
          {Math.round(prediction.probability.good * 100)}% good game probability
        </div>
        <div className={`text-xs font-medium ${getConfidenceColors(prediction.confidence)}`}>
          {prediction.confidence.toUpperCase()} CONFIDENCE
        </div>
      </div>

      {/* Probability Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${prediction.probability.good * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ProbabilityBadge;