import { useState } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFaq } from '@/hooks/useFaq'
import api from '@/lib/api'

function isMarkdown(text: string): boolean {
  return /^#|\*\*?|__?|```|~~|>>|\[.+\]\(.+\)/.test(text)
}

function SimpleMarkdown({ text }: { text: string }) {
  // Very lightweight renderer for headings, bold, italic, code, links, blockquotes, code blocks
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let codeBlock: string[] | null = null

  function renderInline(line: string) {
    // Handle inline code, bold, italic, links
    const parts: React.ReactNode[] = []
    let remaining = line
    let key = 0

    while (remaining.length > 0) {
      // inline code
      const codeMatch = remaining.match(/^`([^`]+)`(.*)$/s)
      if (codeMatch) {
        parts.push(<code key={key++} className="px-1 py-0.5 bg-gray-100 rounded text-sm font-mono">{codeMatch[1]}</code>)
        remaining = codeMatch[2]
        continue
      }
      // bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*(.*)$/)
      if (boldMatch) {
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>)
        remaining = boldMatch[2]
        continue
      }
      // italic
      const italMatch = remaining.match(/^\*([^*]+)\*(.*)$/)
      if (italMatch) {
        parts.push(<em key={key++}>{italMatch[1]}</em>)
        remaining = italMatch[2]
        continue
      }
      // link
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/)
      if (linkMatch) {
        parts.push(<a key={key++} href={linkMatch[2]} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>)
        remaining = linkMatch[3]
        continue
      }
      // plain text until next special char
      const plainMatch = remaining.match(/^[*_`\[#]+/)
      if (plainMatch) {
        parts.push(<span key={key++}>{plainMatch[0]}</span>)
        remaining = remaining.slice(plainMatch[0].length)
        continue
      }
      // one char
      parts.push(<span key={key++}>{remaining[0]}</span>)
      remaining = remaining.slice(1)
    }
    return parts
  }

  for (const line of lines) {
    if (codeBlock !== null) {
      if (line === '```') {
        elements.push(
          <pre key={elements.length} className="bg-gray-100 rounded p-3 text-sm font-mono overflow-x-auto mb-2">
            <code>{codeBlock.join('\n')}</code>
          </pre>
        )
        codeBlock = null
      } else {
        codeBlock.push(line)
      }
      continue
    }

    if (line.startsWith('```')) {
      codeBlock = []
      continue
    }

    if (line.startsWith('## ')) {
      elements.push(<h2 key={elements.length} className="text-lg font-semibold text-gray-900 mt-5 mb-2">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={elements.length} className="text-xl font-bold text-gray-900 mt-5 mb-2">{line.slice(2)}</h1>)
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={elements.length} className="border-l-4 border-indigo-300 pl-3 italic text-gray-600 my-2">{line.slice(2)}</blockquote>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={elements.length} className="ml-4 list-disc text-gray-700">{renderInline(line.slice(2))}</li>)
    } else if (/^\d+\./.test(line)) {
      const m = line.match(/^(\d+)\. (.*)$/)
      if (m) elements.push(<li key={elements.length} className="ml-4 list-decimal text-gray-700">{renderInline(m[2])}</li>)
    } else if (line.trim() === '') {
      elements.push(<div key={elements.length} className="h-2" />)
    } else {
      elements.push(<p key={elements.length} className="text-gray-700 leading-relaxed">{renderInline(line)}</p>)
    }
  }

  return <>{elements}</>
}

export function FaqDetailPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { id } = useParams({ from: '/faqs/$id' } as any)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [toast, setToast] = useState<string | null>(null)
  const [feedbackSent, setFeedbackSent] = useState(false)

  const { data: faq, isLoading } = useFaq(id!)

  const voteMutation = useMutation({
    mutationFn: () => {
      const token = localStorage.getItem('token')
      if (!token) return Promise.reject(new Error('unauthenticated'))
      return api.post(`/faqs/${id}/vote`, { value: 1 })
    },
    onMutate: () => {
      if (!localStorage.getItem('token')) {
        setToast('Please log in to vote.')
        return
      }
      // Optimistic update
      queryClient.cancelQueries({ queryKey: ['faqs', id] })
      const prev = queryClient.getQueryData(['faqs', id])
      if (prev && typeof prev === 'object' && 'upvotes' in prev) {
        queryClient.setQueryData(['faqs', id], { ...prev as object, upvotes: ((prev as { upvotes: number }).upvotes) + 1 })
      }
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['faqs', id], context.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs', id] })
    },
  })

  function handleFeedback(value: 'yes' | 'no') {
    if (feedbackSent || !faq) return
    api.post(`/faqs/${faq._id}/feedback`, { helpful: value === 'yes' }).catch(() => {})
    setFeedbackSent(true)
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="space-y-2 mt-6">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        </div>
      </div>
    )
  }

  if (!faq) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">FAQ not found.</p>
        <Link to="/faqs" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">← Back to FAQs</Link>
      </div>
    )
  }

  const bodyContent = isMarkdown(faq.body) ? <SimpleMarkdown text={faq.body} /> : <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{faq.body}</p>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link to="/faqs" className="hover:text-indigo-600">FAQs</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700">{faq.category}</span>
      </nav>

      {/* Category badge */}
      <div className="mb-3">
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
          {faq.category}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{faq.title}</h1>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-6">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {faq.viewCount} views
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          {faq.upvotes} upvotes
        </span>
        {faq.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded bg-gray-100 text-gray-500">#{tag}</span>
        ))}
      </div>

      {/* Body */}
      <div className="prose prose-slate max-w-none mb-8">
        {bodyContent}
      </div>

      {/* Upvote */}
      <div className="border-t border-b border-gray-200 py-4 mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-600">Was this helpful?</span>
        <button
          onClick={() => voteMutation.mutate()}
          disabled={voteMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          {faq.upvotes + (voteMutation.variables !== undefined ? 1 : 0)}
        </button>
      </div>

      {/* Was This Helpful? feedback */}
      {!feedbackSent && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="text-sm text-gray-600">Did this answer your question?</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleFeedback('yes')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
            >
              ✓ Yes
            </button>
            <button
              onClick={() => handleFeedback('no')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            >
              ✗ No
            </button>
          </div>
        </div>
      )}
      {feedbackSent && (
        <div className="bg-green-50 rounded-xl p-4 mb-6 text-sm text-green-700 text-center">
          Thanks for your feedback!
        </div>
      )}

      {/* Follow-up */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate({ to: '/ask', search: { ref: faq.title } } as any)}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Ask a follow-up question →
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-white">✕</button>
        </div>
      )}
    </div>
  )
}