import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {}

// jsdom doesn't implement matchMedia. We default to a viewport width of 1024
// (desktop), and only width-based queries are evaluated. Any other media
// feature (prefers-reduced-motion, hover, etc.) returns `matches: false` so
// tests don't accidentally enable behaviors keyed off them.
//
// Tests that need the mobile branch can call `setTestViewportWidth(375)` (and
// must reset it in afterEach via `resetTestViewport()`).
let __testViewportWidth = 1024
const __mqlListeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>()

function evalQuery(query: string): boolean {
  const minMatch = /\(min-width:\s*(\d+)px\)/.exec(query)
  if (minMatch) return __testViewportWidth >= Number(minMatch[1])
  const maxMatch = /\(max-width:\s*(\d+)px\)/.exec(query)
  if (maxMatch) return __testViewportWidth <= Number(maxMatch[1])
  return false
}

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => {
    const listeners = (() => {
      const existing = __mqlListeners.get(query)
      if (existing) return existing
      const fresh = new Set<(e: MediaQueryListEvent) => void>()
      __mqlListeners.set(query, fresh)
      return fresh
    })()
    return {
      get matches() {
        return evalQuery(query)
      },
      media: query,
      onchange: null,
      addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        listeners.delete(cb),
      dispatchEvent: () => false,
    } as MediaQueryList
  }
}

export function setTestViewportWidth(width: number) {
  __testViewportWidth = width
  __mqlListeners.forEach((listeners, query) => {
    const matches = evalQuery(query)
    listeners.forEach((cb) => cb({ matches, media: query } as MediaQueryListEvent))
  })
}

export function resetTestViewport() {
  setTestViewportWidth(1024)
}

// Prevent supabase client from being created in tests (requires env vars)
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))
