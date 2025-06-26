import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 24 * 60 * 60 * 1000, // 24 hours - game predictions rarely change
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days - keep in memory longer
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Don't refetch on network reconnect
      refetchOnMount: false, // Don't refetch on component mount if data exists
    },
    mutations: {
      retry: 1,
    },
  },
});

export default queryClient;