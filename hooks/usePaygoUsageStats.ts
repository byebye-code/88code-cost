import { useEffect, useMemo, useState } from "react"

import { fetchUsageTrend } from "~/lib/api/client"

export interface PaygoUsageStats {
  avg30: number
  avg15: number
  avg7: number
  avg3: number
  hasData: boolean
  availableDays: number
}

const DEFAULT_STATS: PaygoUsageStats = {
  avg30: 0,
  avg15: 0,
  avg7: 0,
  avg3: 0,
  hasData: false,
  availableDays: 0
}

function calcAverage(costs: number[], days: number): number {
  if (costs.length === 0) return 0
  const slice = costs.slice(-days)
  if (slice.length === 0) return 0
  const sum = slice.reduce((total, value) => total + value, 0)
  return sum / slice.length
}

export function usePaygoUsageStats(enabled: boolean) {
  const [costs, setCosts] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      const response = await fetchUsageTrend(30, "day")
      if (cancelled) return

      if (response.success && response.data) {
        const sorted = [...response.data].sort((a, b) => a.date.localeCompare(b.date))
        setCosts(sorted.map((item) => Number(item.cost || 0)))
      } else {
        setError(response.message || "获取用量趋势失败")
        setCosts([])
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [enabled])

  const stats = useMemo<PaygoUsageStats>(() => {
    if (!enabled || costs.length === 0) {
      return DEFAULT_STATS
    }
    return {
      avg30: calcAverage(costs, 30),
      avg15: calcAverage(costs, 15),
      avg7: calcAverage(costs, 7),
      avg3: calcAverage(costs, 3),
      hasData: true,
      availableDays: Math.min(30, costs.length)
    }
  }, [costs, enabled])

  return {
    stats,
    loading,
    error
  }
}
