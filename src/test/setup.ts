import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {}

// Prevent supabase client from being created in tests (requires env vars)
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))
