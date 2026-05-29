import { useSearch } from '@tanstack/react-router'
import { useFaqs } from '@/hooks/useFaqs'
import { FaqCard } from '@/components/FaqCard'
import { SearchBar } from '@/components/SearchBar'
import { CategoryFilter } from '@/components/CategoryFilter'

export function FaqsPage() {
  const searchParams = useSearch<{ search?: string; category?: string }>({ from: '/faqs' })
  const search = searchParams.search ?? ''
  const category = searchParams.category ?? ''

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useFaqs(search, category)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Knowledge Base</h1>
        <p className="text-sm text-gray-500">Find answers to common questions</p>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <SearchBar />
        </div>
      </div>

      {/* Category pills */}
      <div className="mb-6">
        <CategoryFilter />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="space-y-2 mb-3">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="flex gap-2 mt-3">
                <div className="h-5 bg-gray-200 rounded w-12" />
                <div className="h-5 bg-gray-200 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ grid */}
      {!isLoading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.pages.flatMap((page) =>
              page.data.map((faq) => <FaqCard key={faq._id} faq={faq} />)
            )}
          </div>

          {/* Empty state */}
          {data.pages[0].data.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg mb-1">No FAQs found</p>
              <p className="text-sm text-gray-400">
                {search ? `No results for "${search}"` : 'Check back later for answers'}
              </p>
            </div>
          )}

          {/* Load more */}
          {hasNextPage && (
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2 border border-indigo-200 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}