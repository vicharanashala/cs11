interface MetricWidgetProps {
  label: string
  value: string | number
  subtext?: string
  accent?: 'indigo' | 'green' | 'yellow' | 'red' | 'blue'
}

const accentMap = {
  indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  green: 'bg-green-50 border-green-100 text-green-700',
  yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
  red: 'bg-red-50 border-red-100 text-red-700',
  blue: 'bg-blue-50 border-blue-100 text-blue-700',
}

export function MetricWidget({ label, value, subtext, accent = 'indigo' }: MetricWidgetProps) {
  return (
    <div className={`rounded-xl border p-5 ${accentMap[accent]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="mt-0.5 text-xs opacity-70">{subtext}</p>}
    </div>
  )
}

interface StatusBarProps {
  label: string
  count: number
  total: number
  color: string
}

export function StatusBar({ label, count, total, color }: StatusBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-xs text-gray-500 text-right">{pct}%</span>
    </div>
  )
}

interface ContributorRowProps {
  name: string
  reputation: number
  rank: number
}

export function ContributorRow({ name, reputation, rank }: ContributorRowProps) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-5 text-center text-sm">{rank <= 3 ? medals[rank - 1] : `#${rank}`}</span>
      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{name}</span>
      <span className="text-xs text-gray-500">{reputation.toLocaleString()} rep</span>
    </div>
  )
}