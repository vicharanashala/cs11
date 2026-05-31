import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import api from '@/lib/api'
import { FaqManagerPanel } from '@/components/admin/FaqManagerPanel'

interface PrefillParams {
  prefillCategory?: string
  prefillTitle?: string
}

export function AdminFaqsPage() {
  const search = useSearch({ from: '/admin/faqs' } as any) as PrefillParams
  const [banner, setBanner] = useState<string | null>(null)
  const [autoOpen, setAutoOpen] = useState(false)

  // If navigated from CategoryCoverageCard, pre-fill the create form and clear params
  useEffect(() => {
    if (search.prefillCategory || search.prefillTitle) {
      setAutoOpen(true)
      // Clear params so a page refresh doesn't re-trigger
      const params = new URLSearchParams(window.location.search)
      params.delete('prefillCategory')
      params.delete('prefillTitle')
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [search])

  const rebuildMutation = useMutation({
    mutationFn: () => api.post('/admin/rebuild-index'),
    onSuccess: () => {
      setBanner('AI index rebuilt successfully.')
      setTimeout(() => setBanner(null), 4000)
    },
    onError: () => {
      setBanner('AI rebuild failed — check that the AI service is running.')
      setTimeout(() => setBanner(null), 5000)
    },
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">FAQ Manager</h1>
        <button
          onClick={() => rebuildMutation.mutate()}
          disabled={rebuildMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {rebuildMutation.isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Rebuilding...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Rebuild AI Index
            </>
          )}
        </button>
      </div>

      {banner && (
        <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {banner}
        </div>
      )}

      <FaqManagerPanel
        prefill={{ category: search.prefillCategory, title: search.prefillTitle }}
        autoOpenCreate={autoOpen}
        onAutoOpenHandled={() => setAutoOpen(false)}
      />
    </div>
  )
}