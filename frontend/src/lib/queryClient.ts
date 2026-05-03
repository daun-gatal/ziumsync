import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s — avoid redundant refetches
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Individual hooks handle onSuccess/onError
    },
  },
});
