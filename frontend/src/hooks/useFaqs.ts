import { useInfiniteQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { FAQ, PaginatedResponse } from '@/types'

interface FaqsParams {
  search?: string
  category?: string
  page?: number
}

async function fetchFaqs({ search = '', category = '', page = 1 }: FaqsParams): Promise<PaginatedResponse<FAQ>> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (category) params.set('category', category)
  params.set('page', String(page))
  params.set('limit', '10')
  const { data } = await api.get(`/faqs?${params}`)
  return data
}

export function useFaqs(search: string, category: string) {
  return useInfiniteQuery({
    queryKey: ['faqs', search, category],
    queryFn: ({ pageParam = 1 }) => fetchFaqs({ search, category, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < Math.ceil(lastPage.total / lastPage.limit)
        ? lastPage.page + 1
        : undefined,
  })
}