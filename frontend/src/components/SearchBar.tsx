import { useState, useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

interface SearchState {
  search?: string
  category?: string
}

interface SearchBarProps {
  /** Route whose search params to update. Defaults to '/faqs'. */
  baseRoute?: string
  placeholder?: string
}

export function SearchBar({ baseRoute = '/faqs', placeholder }: SearchBarProps) {
  const navigate = useNavigate()
  const search = useSearch({ from: baseRoute as any }) as SearchState
  const [value, setValue] = useState(() => search.search ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setValue(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      navigate({
        routeMask: baseRoute,
        search: (prev: SearchState) => ({ ...prev, search: val || undefined }),
      } as any)
    }, 300)
  }

  function handleClear() {
    setValue('')
    navigate({
      routeMask: baseRoute,
      search: (prev: SearchState) => ({ ...prev, search: undefined }),
    } as any)
  }

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? 'Search FAQs…'}
        className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </div>
  )
}