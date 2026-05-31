import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { CategoryCoverageResponse } from '@/types'

export function useQueryClusters() {
  const { isLoading, error, data, refetch } = useQuery<CategoryCoverageResponse>({
    queryKey: ['admin', 'query-insights'],
    queryFn: () => api.get('/admin/query-insights').then((res) => res.data),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return { isLoading, error, data, refetch }
}