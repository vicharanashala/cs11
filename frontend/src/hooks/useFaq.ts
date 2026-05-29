import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { FAQ } from '@/types'

async function fetchFaq(id: string): Promise<FAQ> {
  const { data } = await api.get(`/faqs/${id}`)
  return data
}

export function useFaq(id: string) {
  return useQuery({
    queryKey: ['faqs', id],
    queryFn: () => fetchFaq(id),
    enabled: !!id,
  })
}