import { Link } from '@tanstack/react-router'
import type { FAQ } from '@/types'

/** Strips common Markdown syntax for plain-text preview. */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')   // fenced code blocks
    .replace(/`[^`]*`/g, ' ')           // inline code
    .replace(/!\[.*?\]\(.*?\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text only
    .replace(/#{1,6}\s+/g, ' ')        // headings
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // bold/italic/strikethrough
    .replace(/^\s*[-*+>]\s+/gm, ' ')  // lists / blockquotes
    .replace(/\[\]/g, ' ')            // leftover brackets
    .replace(/\s+/g, ' ')
    .trim()
}

interface FaqCardProps {
  faq: FAQ
}

export function FaqCard({ faq }: FaqCardProps) {
  const categoryName =
    typeof (faq.category as unknown) === 'string'
      ? (faq.category as string)
      : ((faq.category as unknown) as { name?: string })?.name ?? 'Unknown'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Category badge */}
      <div className="mb-2">
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
          {categoryName}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug">
        <Link
          to="/faqs/$id"
          params={{ id: faq._id }}
          className="hover:text-indigo-600 transition-colors"
        >
          {faq.title}
        </Link>
      </h3>

      {/* Body preview — strip markdown, truncate */}
      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
        {stripMarkdown(faq.body).slice(0, 120)}
        {stripMarkdown(faq.body).length > 120 ? '…' : ''}
      </p>

      {/* Tags */}
      {faq.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {faq.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {faq.upvotes}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {faq.viewCount}
          </span>
        </div>
        <Link
          to="/faqs/$id"
          params={{ id: faq._id }}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Read More →
        </Link>
      </div>
    </div>
  )
}