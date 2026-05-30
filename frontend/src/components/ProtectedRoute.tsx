import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate({ to: '/login' } as any)
    }
  }, [navigate])

  return <>{children}</>
}