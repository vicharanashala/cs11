import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { User } from '@/types'

export function useAuth() {
  return useQuery<User | null>({
    queryKey: ['auth/me'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      if (!token) return null
      const { data } = await api.get('/auth/me')
      return data
    },
    retry: false,
    staleTime: Infinity,
  })
}