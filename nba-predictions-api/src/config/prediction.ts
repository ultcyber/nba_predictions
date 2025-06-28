import { config } from 'dotenv';

config();

export interface PredictionConfig {
  goodGameThreshold: number;
}

const validateThreshold = (threshold: number): number => {
  if (isNaN(threshold) || threshold < 0 || threshold > 100) {
    console.warn(`Invalid GOOD_GAME_THRESHOLD: ${threshold}. Using default value of 60.`);
    return 60;
  }
  return threshold;
};

export const predictionConfig: PredictionConfig = {
  goodGameThreshold: validateThreshold(parseInt(process.env.GOOD_GAME_THRESHOLD || '60', 10))
};

export const classifyGame = (rating: number): 'good' | 'bad' => {
  return rating >= predictionConfig.goodGameThreshold ? 'good' : 'bad';
};