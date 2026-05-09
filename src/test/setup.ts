import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {}

// jsdom doesn't implement matchMedia. Default to "desktop" (matches: true)
// so components gated by `useIsDesktop()` render their desktop branch in
// tests — that branch is the more featureful one (DnD, hover tray) and most
// existing tests assert on it.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// Prevent supabase client from being created in tests (requires env vars)
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))
