// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../store/authStore'

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/ws'

/**
 * useWebSocket — STOMP over SockJS (backend ke saath compatible)
 *
 * Topics:
 *   /topic/dashboard  — new order, revenue update
 *   /topic/inventory  — stock level change
 *   /topic/kot        — new KOT from captain
 *
 * Usage:
 *   useWebSocket('/topic/dashboard', (data) => setDashboard(data))
 */
export function useWebSocket(topic, onMessage, deps = []) {
  const token     = useAuthStore(s => s.token)
  const clientRef = useRef(null)
  const subRef    = useRef(null)
  const active    = useRef(true)

  // stable callback ref — stale closure se bachao
  const onMessageRef = useRef(onMessage)
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  const connect = useCallback(() => {
    if (!active.current) return
    if (clientRef.current?.connected) return

    clientRef.current = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay:    5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        if (!active.current) return
        subRef.current = clientRef.current.subscribe(topic, (message) => {
          try {
            const data = JSON.parse(message.body)
            onMessageRef.current(data)
          } catch (_) {}
        })
      },

      onStompError: (frame) => {
        console.warn('[WS] STOMP error:', frame.headers['message'])
      },
    })

    clientRef.current.activate()
  }, [token, topic, ...deps])

  useEffect(() => {
    active.current = true
    connect()
    return () => {
      active.current = false
      subRef.current?.unsubscribe()
      clientRef.current?.deactivate()
      clientRef.current = null
    }
  }, [connect])
}

/**
 * usePolling — fallback for when WebSocket is not available
 */
export function usePolling(refresh, intervalMs = 30000) {
  useEffect(() => {
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])
}
