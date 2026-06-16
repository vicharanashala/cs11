import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { User, UserRole } from '@/types'

interface UserListResponse {
  data: User[]
  totalCount: number
  page: number
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'intern', label: 'Intern' },
  { value: 'admin', label: 'Admin' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, { label: string; cls: string }> = {
    intern: { label: 'Intern', cls: 'bg-gray-100 text-gray-600' },
    admin: { label: 'Admin', cls: 'bg-indigo-100 text-indigo-700' },
    superadmin: { label: 'Superadmin', cls: 'bg-purple-100 text-purple-700' },
  }
  const { label, cls } = map[role]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Inactive</span>
}

type ConfirmState = Record<string, 'idle' | 'confirm'>

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [confirmState, setConfirmState] = useState<ConfirmState>({})
  const [roleError, setRoleError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingRole, setPendingRole] = useState<string | null>(null)

  // Debounce search
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val)
    setPage(1)
    const t = setTimeout(() => setDebouncedSearch(val), 350)
    return () => clearTimeout(t)
  }, [])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '20' }
      if (debouncedSearch) params.search = debouncedSearch
      const { data: res } = await api.get('/users', { params })
      return res as UserListResponse
    },
  })

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data } = await api.patch(`/users/${userId}/role`, { role })
      return data as User
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setPendingRole(null)
      setRoleError(null)
    },
    onError: (err: any) => {
      setRoleError(err?.response?.data?.message ?? 'Failed to update role')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.patch(`/users/${userId}/deactivate`)
      return data as User
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmState({})
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message ?? 'Failed to deactivate')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.patch(`/users/${userId}/reactivate`)
      return data as User
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmState({})
      setActionError(null)
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message ?? 'Failed to reactivate')
    },
  })

  function handleRoleChange(userId: string, newRole: UserRole) {
    setPendingRole(userId)
    setRoleError(null)
    setConfirmState((s) => ({ ...s, [`role-${userId}`]: 'confirm' }))
  }

  function confirmRoleChange(userId: string, newRole: UserRole) {
    roleMutation.mutate({ userId, role: newRole })
    setConfirmState((s) => ({ ...s, [`role-${userId}`]: 'idle' }))
  }

  function handleDeactivate(userId: string) {
    const key = `deact-${userId}`
    if (confirmState[key] !== 'confirm') {
      setConfirmState((s) => ({ ...s, [key]: 'confirm' }))
      return
    }
    deactivateMutation.mutate(userId)
  }

  function handleReactivate(userId: string) {
    const key = `react-${userId}`
    if (confirmState[key] !== 'confirm') {
      setConfirmState((s) => ({ ...s, [key]: 'confirm' }))
      return
    }
    reactivateMutation.mutate(userId)
  }

  function cancelConfirm(key: string) {
    setConfirmState((s) => ({ ...s, [key]: 'idle' }))
    setPendingRole(null)
    setRoleError(null)
    setActionError(null)
  }

  const totalPages = data ? Math.ceil(data.totalCount / 20) : 0

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data ? `${data.totalCount} total user${data.totalCount !== 1 ? 's' : ''}` : 'Loading...'}
          </p>
        </div>
        {isFetching && !isLoading && <span className="text-xs text-indigo-600 animate-pulse">Syncing...</span>}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0 animate-pulse">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-48" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-16" />
              <div className="h-5 bg-gray-200 rounded w-14" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && data.data.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-gray-500 font-medium">No users found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search.</p>
        </div>
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Joined</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((user) => {
                  const isSelf = user._id === currentUser?.id || user._id === currentUser?._id
                  const isSuperadmin = user.role === 'superadmin'
                  const roleConfirmKey = `role-${user._id}`
                  const deactConfirmKey = `deact-${user._id}`
                  const reactConfirmKey = `react-${user._id}`

                  return (
                    <tr key={user._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{user.name}</td>
                      <td className="px-5 py-3.5 text-gray-500">{user.email}</td>
                      <td className="px-5 py-3.5"><RoleBadge role={user.role} /></td>
                      <td className="px-5 py-3.5"><StatusBadge isActive={user.isActive} /></td>
                      <td className="px-5 py-3.5 text-gray-400">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-end gap-1.5">
                          {/* Role change */}
                          {!isSuperadmin && (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={user.role}
                                disabled={isSelf || roleMutation.isPending}
                                onChange={(e) => handleRoleChange(user._id, e.target.value as UserRole)}
                                className="text-xs border border-gray-300 rounded px-1.5 py-1 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                {ROLE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              {roleConfirmKey in confirmState && confirmState[roleConfirmKey] === 'confirm' && pendingRole === user._id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => confirmRoleChange(user._id, user.role)}
                                    disabled={roleMutation.isPending}
                                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    {roleMutation.isPending ? '...' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => cancelConfirm(roleConfirmKey)}
                                    className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          )}
                          {roleError && pendingRole === user._id && (
                            <span className="text-xs text-red-600">{roleError}</span>
                          )}

                          {/* Deactivate / Reactivate */}
                          {!isSelf && !isSuperadmin && (
                            <div className="flex items-center gap-1.5">
                              {user.isActive ? (
                                deactConfirmKey in confirmState && confirmState[deactConfirmKey] === 'confirm' ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDeactivate(user._id)}
                                      disabled={deactivateMutation.isPending}
                                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                    >
                                      {deactivateMutation.isPending ? '...' : 'Confirm Deactivate'}
                                    </button>
                                    <button
                                      onClick={() => cancelConfirm(deactConfirmKey)}
                                      className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleDeactivate(user._id)}
                                    disabled={deactivateMutation.isPending}
                                    className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Deactivate
                                  </button>
                                )
                              ) : (
                                reactConfirmKey in confirmState && confirmState[reactConfirmKey] === 'confirm' ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleReactivate(user._id)}
                                      disabled={reactivateMutation.isPending}
                                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {reactivateMutation.isPending ? '...' : 'Confirm Reactivate'}
                                    </button>
                                    <button
                                      onClick={() => cancelConfirm(reactConfirmKey)}
                                      className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleReactivate(user._id)}
                                    disabled={reactivateMutation.isPending}
                                    className="text-xs px-2 py-1 border border-green-300 text-green-600 rounded hover:bg-green-50 disabled:opacity-50"
                                  >
                                    Reactivate
                                  </button>
                                )
                              )}
                            </div>
                          )}
                          {isSelf && (
                            <span className="text-xs text-gray-400 italic">You</span>
                          )}
                          {isSuperadmin && (
                            <span className="text-xs text-gray-400 italic">Protected</span>
                          )}
                          {actionError && (
                            <span className="text-xs text-red-600">{actionError}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}