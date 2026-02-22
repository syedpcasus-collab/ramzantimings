// Central API service for Ramadan timings backend.
// Uses VITE_API_URL when available, with fallback to provided Apps Script URL.

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec'

const CACHE_KEY = 'ramadan_timings_cache_v1'
const CACHE_TTL_MS = 2 * 60 * 1000

function toQuery(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') searchParams.set(key, value)
  })
  return searchParams.toString()
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // ignore storage errors on constrained devices/browsers
  }
}

function normalizeList(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.timings)) return payload.timings
  return []
}

export async function fetchTimings(params = {}, { revalidate = true } = {}) {
  const query = toQuery(params)
  const url = query ? `${BASE_URL}?${query}` : BASE_URL

  const cached = readCache()
  const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS

  if (isFresh) {
    if (revalidate) {
      fetch(url)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`GET failed (${res.status})`))))
        .then((json) => writeCache(normalizeList(json)))
        .catch(() => {})
    }
    return cached.data
  }

  const response = await fetch(url)
  if (!response.ok) throw new Error(`GET failed (${response.status})`)
  const json = await response.json()
  const list = normalizeList(json)
  writeCache(list)
  return list
}

export async function postTiming(payload, editorKey = '') {
  const body = editorKey ? { ...payload, editor_key: editorKey } : payload

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  let result = null
  try {
    result = await response.json()
  } catch {
    result = { success: false, message: 'Invalid JSON response from backend' }
  }

  if (!response.ok) throw new Error(result?.message || `POST failed (${response.status})`)

  return result
}

export { BASE_URL }
