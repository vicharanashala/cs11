import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Category } from '@/types'

async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get('/categories')
  return data
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })
}