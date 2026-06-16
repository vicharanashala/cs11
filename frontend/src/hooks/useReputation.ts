import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { ReputationHistory } from '@/types'

export function useReputation(page: number = 1) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['reputation', 'me', page],
    queryFn: () =>
      api
        .get<ReputationHistory>('/users/me/reputation', { params: { page, limit: 20 } })
        .then((r) => r.data),
    enabled: !!user,
  })
}