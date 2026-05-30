import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import api from '@/lib/api'

interface AuthUser {
  /** Matches `user._id` (MongoDB ObjectId) returned by `/auth/me` */
  _id: string
  name: string
  role: 'intern' | 'admin' | 'superadmin'
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwt(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    // JWT claim "userId" holds the MongoDB ObjectId string
    return { _id: decoded.userId, name: decoded.name ?? '', role: decoded.role }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (stored) {
      setToken(stored)
      const decoded = decodeJwt(stored)
      if (decoded) {
        setUser(decoded)
        api.get('/auth/me')
          .then(({ data }) => setUser({ _id: data._id, name: data.name, role: data.role }))
          .catch(() => {
            localStorage.removeItem('token')
            setUser(null)
            setToken(null)
          })
          .finally(() => setIsLoading(false))
        return
      } else {
        localStorage.removeItem('token')
        setToken(null)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback((newToken: string) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    const decoded = decodeJwt(newToken)
    if (decoded) setUser(decoded)
    api.get('/auth/me')
      .then(({ data }) => {
        const fullUser = { _id: data._id, name: data.name, role: data.role }
        setUser(fullUser)
        localStorage.setItem('user', JSON.stringify(fullUser))
        navigate({ to: '/faqs' })
      })
      .catch(() => {
        localStorage.removeItem('token')
        setUser(null)
        setToken(null)
      })
  }, [navigate])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    navigate({ to: '/login' })
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}