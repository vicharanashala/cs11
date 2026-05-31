import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Category } from '@/types'

interface SearchState {
  category?: string
  search?: string
}

async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get('/categories')
  return data
}

interface CategoryFilterProps {
  /** Route to update when a category is selected. Defaults to '/faqs'. */
  baseRoute?: string
}

export function CategoryFilter({ baseRoute = '/faqs' }: CategoryFilterProps) {
  const navigate = useNavigate()
  const search = useSearch({ from: baseRoute as any }) as SearchState

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const activeCategory = search.category

  function select(slug: string | undefined) {
    navigate({
      routeMask: baseRoute as any,
      search: (prev: SearchState) => ({
        ...prev,
        category: slug,
      }),
    } as any)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* "All" pill */}
      <button
        onClick={() => select(undefined)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          !activeCategory
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
        }`}
      >
        All
      </button>

      {categories.map((cat) => {
        const isActive = activeCategory === cat.slug
        return (
          <button
            key={cat._id}
            onClick={() => select(cat.slug)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}