import axios from 'axios';
import type {
  GetPredictionsResponse,
  GetSinglePredictionResponse,
  GetHealthResponse,
  PredictionsQueryParams,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 2000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  async getHealth(): Promise<GetHealthResponse> {
    const response = await apiClient.get('/api/v1/health');
    return response.data;
  },

  // Get predictions with filters
  async getPredictions(params?: PredictionsQueryParams): Promise<GetPredictionsResponse> {
    const response = await apiClient.get('/api/v1/predictions', { params });
    return response.data;
  },

  // Get single prediction by ID
  async getPrediction(gameId: string): Promise<GetSinglePredictionResponse> {
    const response = await apiClient.get(`/api/v1/predictions/${gameId}`);
    return response.data;
  },
};

export default apiService;