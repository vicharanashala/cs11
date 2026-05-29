import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

export function SearchBar() {
  const navigate = useNavigate()
  const searchParams = useSearch<{ search?: string }>({ from: '/faqs' })
  const [value, setValue] = useState(searchParams.search ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync with URL on back/forward navigation
  useEffect(() => {
    setValue(searchParams.search ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.search])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setValue(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      navigate({
        from: '/faqs',
        search: (prev) => ({ ...prev, search: val || undefined }),
      })
    }, 300)
  }

  function handleClear() {
    setValue('')
    navigate({
      from: '/faqs',
      search: (prev) => ({ ...prev, search: undefined }),
    })
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
        placeholder="Search FAQs…"
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