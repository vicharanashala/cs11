import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { MetricWidget, StatusBar, ContributorRow } from '@/components/admin/AnalyticsWidget'
import { CategoryCoverageCard } from '@/components/admin/CategoryCoverageCard'
import { useQueryClusters } from '@/hooks/useQueryClusters'

interface AnalyticsData {
  totalFaqs: number
  totalQuestions: { open: number; in_progress: number; resolved: number; closed: number }
  totalAnswers: number
  avgResolutionTimeHours: number | null
  topContributors: Array<{ name: string; reputation: number }>
  categoryBreakdown: Array<{ _id: string; name: string; count: number }>
  aiMatchRate: number
  indexStalenessHours: number | null
}

export function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'query-insights'>('overview')

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/admin/analytics').then((res) => res.data),
    refetchInterval: 60_000,
  })

  const { isLoading: insightsLoading, error: insightsError, data: insightsData, refetch } = useQueryClusters()

  const totalQuestions = data
    ? Object.values(data.totalQuestions).reduce((a, b) => a + b, 0)
    : 0

  const tabBase = 'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors'
  const tabActive = 'border-indigo-600 text-indigo-600'
  const tabInactive = 'border-transparent text-gray-400 hover:text-gray-600'

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-8 gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`${tabBase} ${activeTab === 'overview' ? tabActive : tabInactive}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('query-insights')}
          className={`${tabBase} ${activeTab === 'query-insights' ? tabActive : tabInactive}`}
        >
          Query Insights
        </button>
      </div>

      {/* ---- Overview tab ---- */}
      {activeTab === 'overview' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !data ? (
            <div className="text-center text-gray-400 py-12">Failed to load analytics.</div>
          ) : (
            <>
              {/* Top metrics row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricWidget
                  label="Total FAQs"
                  value={data.totalFaqs.toLocaleString()}
                  accent="indigo"
                />
                <MetricWidget
                  label="AI Match Rate"
                  value={`${data.aiMatchRate}%`}
                  subtext="questions auto-matched"
                  accent="green"
                />
                <MetricWidget
                  label="Community Answers"
                  value={data.totalAnswers.toLocaleString()}
                  accent="blue"
                />
                <MetricWidget
                  label="Avg Resolution Time"
                  value={data.avgResolutionTimeHours != null ? `${data.avgResolutionTimeHours}h` : 'N/A'}
                  subtext="for resolved questions"
                  accent="yellow"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Question status breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">
                    Questions by Status ({totalQuestions})
                  </h2>
                  <div className="space-y-3">
                    <StatusBar label="Open" count={data.totalQuestions.open} total={totalQuestions} color="bg-blue-500" />
                    <StatusBar label="In Progress" count={data.totalQuestions.in_progress} total={totalQuestions} color="bg-yellow-400" />
                    <StatusBar label="Resolved" count={data.totalQuestions.resolved} total={totalQuestions} color="bg-green-500" />
                    <StatusBar label="Closed" count={data.totalQuestions.closed} total={totalQuestions} color="bg-gray-400" />
                  </div>
                </div>

                {/* Top contributors */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Top Contributors</h2>
                  {data.topContributors.length === 0 && (
                    <p className="text-sm text-gray-400 py-4 text-center">No data yet.</p>
                  )}
                  {data.topContributors.map((c, i) => (
                    <ContributorRow key={i} name={c.name} reputation={c.reputation} rank={i + 1} />
                  ))}
                </div>

                {/* Category breakdown chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">FAQs by Category</h2>
                  {data.categoryBreakdown.length === 0 && (
                    <p className="text-sm text-gray-400 py-4 text-center">No data yet.</p>
                  )}
                  {data.categoryBreakdown.map((cat, i) => {
                    const pct = data.totalFaqs > 0 ? Math.round((cat.count / data.totalFaqs) * 100) : 0
                    return (
                      <div key={cat._id ?? i} className="flex items-center gap-3 py-2">
                        <span className="w-36 text-xs text-gray-600 truncate shrink-0">{cat.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-xs text-gray-500 text-right">{pct}%</span>
                        <span className="w-6 text-xs text-gray-400 text-right">{cat.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {data.indexStalenessHours != null && (
                <p className="mt-4 text-xs text-gray-400 text-center">
                  AI index last rebuilt {data.indexStalenessHours}h ago
                  {data.indexStalenessHours > 48 && (
                    <span className="text-amber-500 ml-1">— consider rebuilding</span>
                  )}
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ---- Query Insights tab ---- */}
      {activeTab === 'query-insights' && (
        <div className="space-y-5">
          {/* Header: timestamp + refresh */}
          <div className="flex items-center justify-between">
            {insightsData?.generatedAt ? (
              <p className="text-sm text-gray-500">
                Last updated: {new Date(insightsData.generatedAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            ) : (
              <span />
            )}
            <button
              onClick={() => refetch()}
              disabled={insightsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {insightsLoading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>

          {/* Error state */}
          {insightsError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Could not load query insights. Please try again.
            </div>
          )}

          {/* Explanation */}
          <p className="text-sm text-gray-500">
            Categories are ranked by coverage gap — how many student questions exist per FAQ. A higher gap means that category needs more FAQ attention.
          </p>

          {/* Loading skeletons */}
          {insightsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Category cards */}
          {!insightsLoading && insightsData?.categories && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insightsData.categories.map((cat) => (
                <CategoryCoverageCard key={cat.categoryId} category={cat} />
              ))}
            </div>
          )}

          {!insightsLoading && (!insightsData?.categories || insightsData.categories.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-8">No category data available yet.</p>
          )}
        </div>
      )}
    </div>
  )
}