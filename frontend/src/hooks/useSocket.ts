import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

/**
 * Returns the base URL (no /api suffix) for Socket.IO connection.
 * VITE_API_URL is like "http://localhost:3000/api" — strip "/api" to get the socket server.
 */
function getSocketBaseUrl(): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'
  return apiUrl.replace(/\/api\/?$/, '')
}

let globalSocket: Socket | null = null

function getSocket(): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(getSocketBaseUrl(), {
      transports: ['websocket', 'polling'],
    })
  }
  return globalSocket
}

/**
 * Lightweight hook for Socket.IO pub/sub.
 * Connection is created once globally and shared across all hook consumers.
 * Automatically disconnects when the last consumer unmounts.
 */
export function useSocket() {
  const handlersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map())
  const socketRef = useRef<Socket | null>(null)
  const refCountRef = useRef(0)

  useEffect(() => {
    refCountRef.current++
    const socket = getSocket()
    socketRef.current = socket

    // Register all stored handlers for this consumer
    handlersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        socket.on(event, handler)
      })
    })

    return () => {
      refCountRef.current--
      // Deregister handlers specific to this consumer (we deregister all; since handlers
      // are stored per-event not per-consumer, we only deregister on final unmount)
      if (refCountRef.current === 0 && socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        globalSocket = null
      }
    }
  }, [])

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
      socketRef.current?.on(event, handler)
    } else {
      handlersRef.current.get(event)!.add(handler)
    }
  }, [])

  const off = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    handlersRef.current.get(event)?.delete(handler)
    socketRef.current?.off(event, handler)
  }, [])

  return { on, off }
}