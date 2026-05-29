import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Category } from '@/types'

async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get('/categories')
  return data
}

export function CategoryFilter() {
  const navigate = useNavigate()
  const searchParams = useSearch<{ category?: string }>({ from: '/faqs' })
  const selected = searchParams.category ?? ''

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  function select(slug: string) {
    navigate({
      from: '/faqs',
      search: (prev) => ({
        ...prev,
        category: slug === selected ? undefined : slug,
      }),
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat._id}
          onClick={() => select(cat.slug)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            selected === cat.slug
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}