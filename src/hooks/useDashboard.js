// src/hooks/useDashboard.js
import { useState, useEffect, useCallback } from 'react'
import { dashboardApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

function today() { return new Date().toISOString().split('T')[0] }
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export function useDashboard(period = 'today') {
  const rid = useAuthStore(s => s.restaurantId)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const from = period === 'week' ? daysAgo(6) : period === 'month' ? daysAgo(29) : today()
  const to   = today()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [todayData, salesByType, expenses, items, revChart] = await Promise.all([
        dashboardApi.today(rid).catch(() => null),
        dashboardApi.salesByType(rid, from, to).catch(() => null),
        dashboardApi.expenses(rid, from, to).catch(() => null),
        dashboardApi.itemSales(rid, from, to).catch(() => null),
        dashboardApi.revenueChart(rid).catch(() => null),
      ])
      setData({ todayData, salesByType, expenses, items, revChart })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [rid, from, to])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}
