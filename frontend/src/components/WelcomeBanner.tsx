import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

const DISMISSED_KEY = 'crowdfaq_welcome_dismissed'

export function WelcomeBanner() {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!user.isFirstTimeIntern) return
    if (localStorage.getItem(DISMISSED_KEY)) return
    setVisible(true)
  }, [user])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
    // Fire and forget — don't block UI on the API call
    api.patch('/auth/me/first-time').catch(() => {
      // Silent failure; user has already dismissed locally
    })
  }

  if (!visible) return null

  return (
    <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg" role="img" aria-label="waving hand">
          👋
        </span>
        <span className="font-bold text-blue-900 text-base flex-1 ml-3">
          Welcome to CrowdFAQ
        </span>
        <button
          onClick={dismiss}
          className="text-blue-400 hover:text-blue-600 transition-colors text-sm leading-none p-1"
          aria-label="Dismiss welcome banner"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="space-y-0.5 text-sm text-blue-800">
        <p>It is completely normal to have questions during onboarding.</p>
        <p>No question is too basic here — the community has your back.</p>
        <p>Ask anything. Someone has almost certainly been through the same thing.</p>
      </div>

      {/* Footer */}
      <p className="mt-2 text-xs text-blue-400">
        This message is shown only once.
      </p>
    </div>
  )
}