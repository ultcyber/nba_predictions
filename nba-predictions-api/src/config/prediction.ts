import { config } from 'dotenv';

config();

export interface PredictionConfig {
  goodGameThreshold: number;
  mediocreGameThreshold: number;
}

const validateThreshold = (threshold: number, defaultValue: number, name: string): number => {
  if (isNaN(threshold) || threshold < 0 || threshold > 100) {
    console.warn(`Invalid ${name}: ${threshold}. Using default value of ${defaultValue}.`);
    return defaultValue;
  }
  return threshold;
};

export const predictionConfig: PredictionConfig = {
  goodGameThreshold: validateThreshold(parseInt(process.env.GOOD_GAME_THRESHOLD || '80', 10), 80, 'GOOD_GAME_THRESHOLD'),
  mediocreGameThreshold: validateThreshold(parseInt(process.env.MEDIOCRE_GAME_THRESHOLD || '60', 10), 60, 'MEDIOCRE_GAME_THRESHOLD')
};

export const classifyGame = (rating: number): 'good' | 'mediocre' | 'bad' => {
  if (rating >= predictionConfig.goodGameThreshold) {
    return 'good';
  } else if (rating >= predictionConfig.mediocreGameThreshold) {
    return 'mediocre';
  } else {
    return 'bad';
  }
};