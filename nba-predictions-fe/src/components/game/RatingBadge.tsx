import React from 'react';
import type { GamePrediction } from '../../types/api';

interface RatingBadgeProps {
  prediction: GamePrediction;
  size?: 'small' | 'medium' | 'large';
}

const HIGH_THRESHOLD = parseInt(import.meta.env.VITE_HIGH_THRESHOLD || '80', 10);
const LOW_THRESHOLD = parseInt(import.meta.env.VITE_LOW_THRESHOLD || '60', 10);

const RatingBadge: React.FC<RatingBadgeProps> = ({ prediction, size = 'medium' }) => {
  const getClassification = (rating: number): 'great' | 'good' | 'bad' => {
    if (rating >= HIGH_THRESHOLD) return 'great';
    if (rating >= LOW_THRESHOLD) return 'good';
    return 'bad';
  };

  const classification = getClassification(prediction.rating);

  const getClassificationColors = (classification: string) => {
    switch (classification) {
      case 'great':
        return 'bg-orange-100 text-orange-800 border-orange-200 shadow-orange-200 shadow-md animate-pulse';
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'bad':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRatingColors = (classification: string) => {
    switch (classification) {
      case 'great':
        return 'text-green-600';
      case 'good':
        return 'text-green-600';
      case 'bad':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getClassificationLabel = (classification: string) => {
    if (classification === 'great') {
      return '🔥 GREAT 🔥';
    }
    return classification.toUpperCase();
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
        <span className={`inline-flex items-center rounded-full border font-medium ${getSizeClasses()} ${getClassificationColors(classification)}`}>
          {getClassificationLabel(classification)}
        </span>
      </div>

      {/* Rating Display */}
      <div className={`${getRatingDisplay()} ${getRatingColors(classification)}`}>
        {prediction.rating}<span className="text-gray-500 text-base">/100</span>
      </div>
    </div>
  );
};

export default RatingBadge;