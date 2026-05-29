import api from '@/lib/api'
import { User } from '@/types'

export const authService = {
  register: (payload: { name: string; email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/register', payload),

  login: (payload: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', payload),

  me: () => api.get<User>('/auth/me'),
}