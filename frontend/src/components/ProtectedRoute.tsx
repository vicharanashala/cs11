import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      navigate({ to: '/login' } as any)
      return
    }
    setChecked(true)
  }, [user, isLoading, navigate])

  if (isLoading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}