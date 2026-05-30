import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { MetricWidget, StatusBar, ContributorRow } from '@/components/admin/AnalyticsWidget'

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
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const { data: res } = await api.get('/admin/analytics')
      return res as AnalyticsData
    },
    refetchInterval: 60_000,
  })

  const totalQuestions = data
    ? Object.values(data.totalQuestions).reduce((a, b) => a + b, 0)
    : 0

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 text-center text-gray-400">
        Failed to load analytics.
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

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
            <StatusBar
              label="Open"
              count={data.totalQuestions.open}
              total={totalQuestions}
              color="bg-blue-500"
            />
            <StatusBar
              label="In Progress"
              count={data.totalQuestions.in_progress}
              total={totalQuestions}
              color="bg-yellow-400"
            />
            <StatusBar
              label="Resolved"
              count={data.totalQuestions.resolved}
              total={totalQuestions}
              color="bg-green-500"
            />
            <StatusBar
              label="Closed"
              count={data.totalQuestions.closed}
              total={totalQuestions}
              color="bg-gray-400"
            />
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

        {/* Category breakdown — horizontal bar chart (Tailwind only) */}
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
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-xs text-gray-500 text-right">{pct}%</span>
                <span className="w-6 text-xs text-gray-400 text-right">{cat.count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Index staleness footer */}
      {data.indexStalenessHours != null && (
        <p className="mt-4 text-xs text-gray-400 text-center">
          AI index last rebuilt {data.indexStalenessHours}h ago
          {data.indexStalenessHours > 48 && (
            <span className="text-amber-500 ml-1"> — consider rebuilding</span>
          )}
        </p>
      )}
    </div>
  )
}