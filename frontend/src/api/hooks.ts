import { useCallback, useEffect, useState } from 'react'
import { api } from './client'
import type { ApplicationCard, ApplicationDetail, ReminderWithApplication, Stats } from './types'

export interface Fetched<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useFetch<T>(path: string): Fetched<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<T>(path)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, refetch }
}

export const useApplications = () => useFetch<ApplicationCard[]>('/api/applications')

export const useApplication = (id: number | string) =>
  useFetch<ApplicationDetail>(`/api/applications/${id}`)

export const useStats = () => useFetch<Stats>('/api/stats')

export const useUpcomingReminders = (days = 14) =>
  useFetch<ReminderWithApplication[]>(`/api/reminders?upcoming=true&days=${days}`)
