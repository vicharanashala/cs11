import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'

const adminNav = [
  {
    label: 'Resolution Queue',
    to: '/admin/queries',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    label: 'FAQ Manager',
    to: '/admin/faqs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    to: '/admin/analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export function AdminPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  function isActive(to: string) {
    // Match exact or child route
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin</h2>
          <p className="mt-0.5 text-sm font-medium text-gray-800 truncate">
            {user?.name ?? 'Admin'}
          </p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {adminNav.map(({ label, to, icon }) => (
            <button
              key={to}
              onClick={() => navigate({ to } as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(to)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={isActive(to) ? 'text-indigo-500' : 'text-gray-400'}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}