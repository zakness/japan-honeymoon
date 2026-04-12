# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## About This File

This CLAUDE.md follows the principles from [Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md):

- **Short and universal** — only instructions applicable to every session. Target under 300 lines.
- **WHY / WHAT / HOW** — project purpose, stack, and workflow. Not task-specific schema dumps.
- **No style guidelines** — linting is handled deterministically by pre-commit hooks (ESLint + Prettier via lint-staged). Don't re-state formatting rules here.
- **File:line pointers over code snippets** — snippets go stale; pointers stay accurate.
- **Progressive disclosure** — add `agent_docs/` files for deep dives; reference them here.

---

## Project Purpose

A shared trip-planning SPA for a Japan honeymoon (May 15–30, 2026). No login required — designed as a private two-person workspace. The app has three views: a combined Itinerary view (day columns + city map), freeform notes, and logistics.

---

## Commands

```bash
npm run dev          # Dev server at http://localhost:5175
npm run build        # tsc -b && vite build
npm run type-check   # TypeScript check only
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm test             # Vitest run (once)
npm run test:watch   # Vitest watch mode
```

Run a single test file:

```bash
npx vitest run src/test/PlaceForm.test.tsx
```

---

## Stack

- **Vite 6 + React 19 + TypeScript** (strict mode, no unused vars/params)
- **Tailwind CSS v4** — theme defined inline in `src/index.css` (no `tailwind.config`)
- **shadcn/ui** (`base-nova` style) with `@base-ui/react` primitives
- **Supabase** (Postgres) — no auth; RLS allows open read/write for the `anon` role
- **TanStack Query v5** — all server state; 30s stale time, 1 retry
- **@vis.gl/react-google-maps** — AdvancedMarkers require `VITE_GOOGLE_MAP_ID`
- **@dnd-kit** — drag-to-reorder in itinerary and notes views

Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAP_ID`

---

## Architecture

**Hash-based navigation** — no React Router. `AppShell.tsx` parses `#itinerary/{city}`, `#notes`, `#logistics` directly.

**Itinerary view** — `src/components/itinerary/ItineraryView.tsx`. Left half: horizontally scrollable day columns (one per day in the selected city) plus a sticky Unscheduled column. Right half: `CityMap` scoped to the selected city. City strip at top switches between the 5 cities. On mobile: map fills screen, bottom sheet (58vh) holds the columns. DnD is handled by `useCrossItineraryDnD` (`src/hooks/`) which supports same-day, cross-slot, cross-day, and unscheduled→day moves.

**Hardcoded trip config** — all 16 days, cities, and transit flags live in `src/config/trip.ts`. `getDaysForCity(city)` and `CITY_MAP_CENTER` are used by the itinerary view.

**Two-step unscheduled query** — PostgREST doesn't support subqueries. `useUnscheduledPlaces` (`src/hooks/useItinerary.ts`) fetches scheduled place IDs first, then excludes them in a second query.

**Optimistic drag-and-drop** — `useCrossItineraryDnD`, `useMoveItemToDay`, `useReorderDayItemsDynamic`, and `useReorderNotes` update the UI immediately and roll back on error. Droppable IDs encode both day and slot: `slot-{YYYY-MM-DD}-{slot}`.

**Google Places caching** — place details are written to Supabase on first lookup (`useGooglePlaceDetails.ts`) to avoid redundant API calls.

**Data layer** — mutations and queries are co-located in hooks under `src/hooks/`. Components don't call Supabase directly.

---

## Testing

Tests live in `src/test/`. The Vitest environment is `jsdom` with a `scrollIntoView` shim (`src/test/setup.ts`). Path alias `@/` → `src/` is available in tests via `vitest.config.ts`.
