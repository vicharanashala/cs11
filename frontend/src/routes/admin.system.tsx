import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Category } from '@/types'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

interface SystemHealth {
  totalUsers: number
  totalFaqs: number
  totalQuestions: number
  totalAnswers: number
  openQuestions: number
  embeddingIndexSize: number
  lastIndexRebuild: string | null
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

type EditingCategory = { _id: string; name: string; description: string; color: string } | null

export function AdminSystemPage() {
  const queryClient = useQueryClient()

  // ── System health ─────────────────────────────────────────────
  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data } = await api.get('/admin/system-health')
      return data as SystemHealth
    },
    refetchInterval: 60_000,
  })

  // ── Rebuild index ─────────────────────────────────────────────
  const rebuildMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/rebuild-index')
      return data as { rebuilt: boolean; count: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-health'] })
    },
  })

  // ── Categories ────────────────────────────────────────────────
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories')
      return data as (Category & { faqCount?: number })[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; slug: string; description: string; color: string }) => {
      const { data } = await api.post('/categories', payload)
      return data as Category
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; description: string; color: string }) => {
      const { data } = await api.patch(`/categories/${id}`, payload)
      return data as Category
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  // ── Create form state ─────────────────────────────────────────
  const [newForm, setNewForm] = useState({ name: '', slug: '', description: '', color: PRESET_COLORS[0] })
  const [createError, setCreateError] = useState<string | null>(null)

  function handleNewNameChange(name: string) {
    setNewForm((f) => ({
      ...f,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    }))
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.name.trim() || !newForm.color) return
    setCreateError(null)
    createMutation.mutate(newForm, {
      onError: (err: any) => setCreateError(err?.response?.data?.message ?? 'Failed to create category'),
      onSuccess: () => {
        setNewForm({ name: '', slug: '', description: '', color: PRESET_COLORS[0] })
        setCreateError(null)
      },
    })
  }

  // ── Inline edit state ─────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '' })
  const [editError, setEditError] = useState<string | null>(null)

  function startEdit(cat: Category & { faqCount?: number }) {
    setEditingId(cat._id)
    setEditForm({ name: cat.name, description: cat.description ?? '', color: cat.color })
    setEditError(null)
  }

  function submitEdit(catId: string) {
    if (!editForm.name.trim()) return
    updateMutation.mutate({ id: catId, ...editForm }, {
      onError: (err: any) => setEditError(err?.response?.data?.message ?? 'Failed to update'),
      onSuccess: () => {
        setEditingId(null)
        setEditError(null)
      },
    })
  }

  // ── Delete confirm state ───────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete(catId: string) {
    if (confirmDelete !== catId) {
      setConfirmDelete(catId)
      return
    }
    deleteMutation.mutate(catId, {
      onError: (err: any) => {
        setDeleteError(err?.response?.data?.message ?? 'Failed to delete')
        setConfirmDelete(null)
      },
      onSuccess: () => {
        setConfirmDelete(null)
        setDeleteError(null)
      },
    })
  }

  function formatRebuildDate(iso: string | null) {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const health = healthQuery.data

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

      {/* ── System health ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">System Health</h2>
          <button
            onClick={() => healthQuery.refetch()}
            disabled={healthQuery.isFetching}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {healthQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total Users" value={health?.totalUsers} />
          <MetricCard label="Published FAQs" value={health?.totalFaqs} />
          <MetricCard label="Total Questions" value={health?.totalQuestions} />
          <MetricCard label="Open Questions" value={health?.openQuestions} />
          <MetricCard label="Total Answers" value={health?.totalAnswers} />
          <MetricCard label="Embedding Index" value={health?.embeddingIndexSize} />
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Index Rebuild</p>
            <p className="text-lg font-bold text-gray-900">{formatRebuildDate(health?.lastIndexRebuild ?? null)}</p>
          </div>
        </div>
      </section>

      {/* ── Rebuild AI index ────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">AI Embedding Index</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-4">
            Re-embed all published FAQs into the vector search index. This operation may take several seconds.
          </p>
          <button
            onClick={() => rebuildMutation.mutate()}
            disabled={rebuildMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rebuildMutation.isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Rebuilding...
              </>
            ) : 'Rebuild embedding index'}
          </button>
          {rebuildMutation.isSuccess && (
            <p className="mt-3 text-sm text-green-600 font-medium">
              ✅ Rebuild complete — {rebuildMutation.data?.count ?? 0} FAQs indexed
            </p>
          )}
          {rebuildMutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              ❌ Rebuild failed. Check that the AI service is running.
            </p>
          )}
        </div>
      </section>

      {/* ── Category management ─────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Categories</h2>

        {/* Create form */}
        <form onSubmit={submitCreate} className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New category</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => handleNewNameChange(e.target.value)}
                placeholder="e.g. IT Support"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Slug (auto-generated)</label>
              <input
                type="text"
                value={newForm.slug}
                onChange={(e) => setNewForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="it-support"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                type="text"
                value={newForm.description}
                onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Color *</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewForm((f) => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${newForm.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={newForm.color}
                  onChange={(e) => setNewForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-7 h-7 rounded-full border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create category'}
          </button>
        </form>

        {/* Category list */}
        {categoriesQuery.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!categoriesQuery.isLoading && categoriesQuery.data?.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400">No categories yet. Create one above.</p>
          </div>
        )}

        {!categoriesQuery.isLoading && categoriesQuery.data && categoriesQuery.data.length > 0 && (
          <div className="space-y-2">
            {categoriesQuery.data.map((cat) => {
              const isEditing = editingId === cat._id
              const isConfirmDelete = confirmDelete === cat._id

              return (
                <div key={cat._id} className="bg-white rounded-xl border border-gray-200 p-4">
                  {isEditing ? (
                    // Inline edit form
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Name *</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Slug</label>
                          <input
                            type="text"
                            value={cat.slug}
                            readOnly
                            title="Slugs cannot be changed"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-400 mt-0.5">Slugs are immutable</p>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Color</label>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditForm((f) => ({ ...f, color: c }))}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${editForm.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <input
                              type="color"
                              value={editForm.color}
                              onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                              className="w-7 h-7 rounded-full border-0 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                      {editError && <p className="text-sm text-red-600">{editError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitEdit(cat._id)}
                          disabled={updateMutation.isPending}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditError(null) }}
                          className="px-3 py-1.5 text-gray-600 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display row
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                          <p className="text-xs text-gray-400">{cat.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(cat.faqCount ?? 0) > 0 && (
                          <span className="text-xs text-gray-400 mr-2">{cat.faqCount} FAQ{cat.faqCount !== 1 ? 's' : ''}</span>
                        )}
                        <button
                          onClick={() => startEdit(cat)}
                          className="px-2.5 py-1 text-xs text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat._id)}
                          disabled={deleteMutation.isPending}
                          className={`px-2.5 py-1 text-xs rounded border ${
                            isConfirmDelete
                              ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                              : 'border-red-200 text-red-600 hover:bg-red-50'
                          } disabled:opacity-50`}
                        >
                          {isConfirmDelete ? 'Confirm delete?' : 'Delete'}
                        </button>
                        {isConfirmDelete && (
                          <button
                            onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {deleteError && confirmDelete === cat._id && (
                    <p className="mt-2 text-sm text-red-600">{deleteError}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}