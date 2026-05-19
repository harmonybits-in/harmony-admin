// src/hooks/useRiderWebSocket.js
// STOMP over SockJS — backend WebSocket ke saath compatible
//
// Backend:
//   WebSocketConfig → /ws endpoint, STOMP broker
//   WebSocketService.sendRiderLocation() → /topic/rider/{riderId}
//   RiderService.updateLocation() → saves + broadcasts

import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../store/authStore'

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/ws'

/**
 * useRiderWebSocket
 *
 * @param {number[]}  riderIds   - subscribe karne wale rider IDs
 * @param {function}  onLocation - callback({ riderId, latitude, longitude, timestamp })
 */
export function useRiderWebSocket(riderIds, onLocation, onConnected) {
  const token         = useAuthStore(s => s.token)
  const clientRef     = useRef(null)
  const subsRef       = useRef({})      // riderId → subscription
  const activeRef     = useRef(true)
  const riderIdsRef   = useRef(riderIds)
  const onLocationRef = useRef(onLocation)
  const onConnectedRef = useRef(onConnected)

  // Always latest callback/riderIds — stale closure se bachao
  useEffect(() => { onLocationRef.current  = onLocation  }, [onLocation])
  useEffect(() => { onConnectedRef.current = onConnected }, [onConnected])
  useEffect(() => { riderIdsRef.current    = riderIds    }, [riderIds])

  // ── Subscribe to one rider ──────────────────────────────────────
  const subscribeRider = useCallback((riderId) => {
    if (!clientRef.current?.connected) return
    if (subsRef.current[riderId]) return   // already subscribed

    const sub = clientRef.current.subscribe(
      `/topic/rider/${riderId}`,
      (message) => {
        try {
          const loc = JSON.parse(message.body)
          onLocationRef.current({
            riderId:   loc.riderId   ?? riderId,
            latitude:  loc.latitude,
            longitude: loc.longitude,
            timestamp: Date.now(),
          })
        } catch (e) {
          console.warn('[WS] Location parse error:', e)
        }
      }
    )
    subsRef.current[riderId] = sub
  }, [])

  // ── Unsubscribe from one rider ──────────────────────────────────
  const unsubscribeRider = useCallback((riderId) => {
    subsRef.current[riderId]?.unsubscribe()
    delete subsRef.current[riderId]
  }, [])

  // ── Connect ─────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!activeRef.current) return
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
        if (!activeRef.current) return
        // Subscribe to all current riders
        riderIdsRef.current.forEach(id => subscribeRider(id))
        onConnectedRef.current?.()
      },

      onStompError: (frame) => {
        console.warn('[RiderWS] STOMP error:', frame.headers['message'])
      },

      onDisconnect: () => {
        // Clear subs — reconnect pe fresh subscribe hoga
        subsRef.current = {}
      },
    })

    clientRef.current.activate()
  }, [token, subscribeRider])

  // ── Sync subscriptions when riderIds list changes ───────────────
  useEffect(() => {
    if (!clientRef.current?.connected) return

    // Subscribe to new riders
    riderIds.forEach(id => subscribeRider(id))

    // Unsubscribe from removed riders
    Object.keys(subsRef.current).forEach(id => {
      if (!riderIds.includes(Number(id))) unsubscribeRider(Number(id))
    })
  }, [riderIds, subscribeRider, unsubscribeRider])

  // ── Connect / disconnect lifecycle ──────────────────────────────
  useEffect(() => {
    activeRef.current = true
    connect()
    return () => {
      activeRef.current = false
      Object.values(subsRef.current).forEach(s => s.unsubscribe())
      subsRef.current = {}
      clientRef.current?.deactivate()
      clientRef.current = null
    }
  }, [connect])

  return {
    reconnect:   connect,
    isConnected: () => !!clientRef.current?.connected,
  }
}
