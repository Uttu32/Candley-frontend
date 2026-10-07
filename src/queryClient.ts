import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './services/api'

export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Client errors (validation, auth, not found) will not succeed on retry.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
})
