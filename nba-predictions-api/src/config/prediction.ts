import { config } from 'dotenv';

config();

export interface PredictionConfig {
  highThreshold: number;
  lowThreshold: number;
}

const validateThreshold = (threshold: number, defaultValue: number, name: string): number => {
  if (isNaN(threshold) || threshold < 0 || threshold > 100) {
    console.warn(`Invalid ${name}: ${threshold}. Using default value of ${defaultValue}.`);
    return defaultValue;
  }
  return threshold;
};

export const predictionConfig: PredictionConfig = {
  highThreshold: validateThreshold(parseInt(process.env.HIGH_THRESHOLD || '80', 10), 80, 'HIGH_THRESHOLD'),
  lowThreshold: validateThreshold(parseInt(process.env.LOW_THRESHOLD || '60', 10), 60, 'LOW_THRESHOLD')
};

export const classifyGame = (rating: number): 'great' | 'good' | 'bad' => {
  if (rating >= predictionConfig.highThreshold) {
    return 'great';
  } else if (rating >= predictionConfig.lowThreshold) {
    return 'good';
  } else {
    return 'bad';
  }
};