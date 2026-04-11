# Japan Honeymoon Trip Planner

A shared web app for planning a 2-week Japan honeymoon (May 15–30, 2026). No login required — one shared workspace for two people.

## Features

- **Map view** — All saved places on a full-screen Google Map. Filter by day, category, or priority. Click a marker to see details or edit. Add places via Google search or manual entry.
- **Day view** — Daily itinerary grouped by morning / afternoon / evening. Drag to reorder. Add places from the backlog or add free-text notes.
- **Notes** — Freeform notes with auto-save and drag-to-reorder.

## Tech Stack

| Layer         | Library                                                               |
| ------------- | --------------------------------------------------------------------- |
| Frontend      | Vite + React 19 + TypeScript                                          |
| UI            | Tailwind CSS v4 + shadcn/ui (`@base-ui/react`)                        |
| Database      | Supabase (Postgres)                                                   |
| Maps          | Google Maps JS API + Places API (New) via `@vis.gl/react-google-maps` |
| Drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable`                                 |
| Server state  | TanStack Query v5                                                     |
| Deploy        | Vercel                                                                |

## Local Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) project with **Maps JavaScript API**, **Places API (New)**, and a Map ID configured

### 1. Clone and install

```bash
git clone <repo-url>
cd japan-honeymoon
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_GOOGLE_MAP_ID=<your-map-id>
```

`VITE_GOOGLE_MAP_ID` is required for AdvancedMarkers. Create one in Google Cloud Console → Google Maps Platform → Map Management.

### 3. Database migration

Run the migration against your Supabase project:

```bash
# Using the Supabase CLI (recommended)
supabase link --project-ref <project-ref>
supabase db push

# Or paste supabase/migrations/001_initial_schema.sql directly in the Supabase SQL editor
```

Optionally seed sample data:

```bash
# In the Supabase SQL editor, paste the contents of:
# supabase/seed.sql
```

### 4. Run the dev server

```bash
npm run dev
# Opens at http://localhost:5175
```

## Testing

```bash
npm test            # run once
npm run test:watch  # watch mode
```

Tests live in `src/test/`. The suite covers:

- `trip.test.ts` — trip config (day count, city assignments, transit days, helper functions)
- `utils.test.ts` — `cn()` Tailwind class merger
- `PlaceForm.test.tsx` — PlaceForm component (create/edit modes, search/manual toggle, tags)
- `DaySelector.test.tsx` — DaySelector component (rendering, selection, transit indicators)

## Project Structure

```
src/
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── layout/           # AppShell, NavBar, ErrorBoundary
│   ├── map/              # MapView, PlaceMarker, MapFilterBar
│   ├── places/           # PlaceSearch, PlaceForm, PlaceCard, PlaceDetail, PlaceList
│   ├── day/              # DayView, DaySelector, DayItinerary, ItineraryItem, BacklogPanel, AddItemDialog
│   └── notes/            # NotesView, NotesList, NoteCard, NoteEditor
├── hooks/
│   ├── usePlaces.ts      # TanStack Query CRUD for places
│   ├── useItinerary.ts   # TanStack Query CRUD for itinerary items
│   ├── useNotes.ts       # TanStack Query CRUD for notes
│   └── useGooglePlaceDetails.ts
├── config/
│   └── trip.ts           # Hardcoded trip dates, cities, transit flags
├── types/
│   ├── database.ts       # Supabase-generated types
│   └── places.ts         # App-level union types (PlaceCategory, PlacePriority, PlaceStatus)
├── lib/
│   ├── supabase.ts       # Singleton Supabase client
│   ├── google-maps.ts    # Map constants and category colors/icons
│   └── utils.ts          # cn() helper
└── test/                 # Vitest test files
supabase/
├── migrations/           # SQL migrations
└── seed.sql              # Sample data
```

## Architecture Notes

- **No auth** — RLS policies allow open read/write for the `anon` role. Fine for a private two-person tool.
- **Hash navigation** — `#map`, `#day`, `#day/2026-05-17`, `#notes`. No React Router; custom `parseHash`/`toHash` in `AppShell.tsx`.
- **Trip config is hardcoded** — `src/config/trip.ts` defines all 16 days, cities, and transit flags. Nothing in the database.
- **Two-step unscheduled query** — PostgREST doesn't support subqueries. `useUnscheduledPlaces` fetches scheduled place IDs first, then excludes them in a second query.
- **Optimistic drag-and-drop** — `useReorderItineraryItems` and `useReorderNotes` update the UI immediately and roll back on error.
- **Google Places cache** — Place details are stored in Supabase after the first lookup to avoid redundant API calls.

## Deployment

The app is deployed to Vercel. `vercel.json` includes an SPA rewrite so all routes serve `index.html`.

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Set the same four environment variables in the Vercel project dashboard. Restrict the Google Maps API key to the Vercel domain (`*.vercel.app` or your custom domain) plus `localhost` for local dev.
