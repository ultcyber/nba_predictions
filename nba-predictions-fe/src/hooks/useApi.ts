import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { PredictionsQueryParams } from '../types/api';

// Query keys for React Query
export const queryKeys = {
  health: ['health'] as const,
  predictions: (params?: PredictionsQueryParams) => ['predictions', params] as const,
  prediction: (gameId: string) => ['prediction', gameId] as const,
};

// Health check hook
export const useHealth = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: apiService.getHealth,
    refetchInterval: 30000, // Refetch every 5 seconds
    retry: 0, // Do not retry on failure
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache results
  });
};

// Predictions list hook
export const usePredictions = (params?: PredictionsQueryParams) => {
  return useQuery({
    queryKey: queryKeys.predictions(params),
    queryFn: () => apiService.getPredictions(params),
    enabled: true,
  });
};

// Single prediction hook
export const usePrediction = (gameId: string) => {
  return useQuery({
    queryKey: queryKeys.prediction(gameId),
    queryFn: () => apiService.getPrediction(gameId),
    enabled: !!gameId,
  });
};