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

**Itinerary view — desktop** — `src/components/itinerary/ItineraryView.tsx`. Horizontally scrollable day columns (one per day in the selected city) plus a sticky Unscheduled column on the left; the right side is a flex-column with `CityMap` on top and the shared `DetailPanel` (`src/components/itinerary/DetailPanel.tsx`) directly below it. The detail panel is a sibling of the map — it never overlays the map's viewport. Height is `0` when no selection is active and `340px` when a place/hotel/journey is selected, with an `180ms` height transition; `CityMap`'s `ResizeObserver` re-pans the active selection after the layout settles. City strip at top switches between the 5 cities. DnD via `useCrossItineraryDnD` (`src/hooks/`) supports same-day, cross-slot, cross-day, and unscheduled→day moves.

**Itinerary view — mobile** — fundamentally different layout, gated by `useIsDesktop()` (`src/hooks/useIsDesktop.ts`, 640px breakpoint). Fixed 40/60 vertical split with no draggable sheet: `CityMap` occupies the top `40dvh` (dvh, not vh — accounts for collapsing iOS Safari chrome), the bottom region holds itinerary content. By default the bottom shows `CityStrip` → `DayStrip` → a single `DayColumn` (or `UnscheduledColumn` when the `Places` tab is active). When a place/hotel/journey is selected, the same shared `DetailPanel` replaces the itinerary content; the itinerary subtree stays mounted (visibility-toggled, `pointer-events-none`) so scroll position survives a select+close cycle. `DayStrip` is a horizontal scroller of the city's days plus a right-pinned `Places` tab; the selected day uses the city's `tint`, edges fade via `mask-image` when overflowing. There is **no horizontal day swiper** — day changes happen through the strip tabs only. Only one day mounts at a time. `DayColumn` and `UnscheduledColumn` accept a `fillWidth` prop for the mobile single-column layout. Hotel anchors render inline at the top/bottom of the scrollable day body and scroll out of view (rather than pinning), freeing vertical space on mobile. Initial city framing uses `fitBounds` over all the city's pins (places + hotels) with symmetric padding — the map is NOT re-fit when the user navigates around it. The map is only ever re-panned/re-fit when the active selection changes or when the map container is resized (handled in `CityMap` via `ResizeObserver`). Page-level rubber-banding is disabled via `overscroll-behavior: none` on `html, body` in `src/index.css`.

**Mobile day-column cards — list-row layout** — `SortableItemCard` branches its inner layout on `useIsDesktop()`. Mobile renders place cards as a flex row: 88px `CardBanner` (orientation `'side'`, photo or tinted-icon fallback) on the left + content (title, reservation pill, notes preview) on the right. Transport and text-note cards are full-width on mobile (no side block) for more content room. Desktop keeps the existing top-banner layout.

**Mobile actions — swipe to reveal** — `SortableItemCard` carries `actions: CardAction[]` (`{ icon, label, onClick, variant? }`). Desktop renders them as the existing absolute hover-reveal icon tray. Mobile wraps the foreground in `SwipeableCard` (`src/components/day/SwipeableCard.tsx`): swipe the card left to slide the foreground over an action panel underneath; past 40% of the card width the gesture commits and snaps fully open. Tap a panel button to fire the action and auto-close; tap the slid foreground or anywhere outside the card to dismiss; opening another card closes the previous via a module-level subject. Vertical scrolls are released early via the same axis-lock pattern used by `useCrossItineraryDnD`. Slot-change is no longer a card action anywhere — it's desktop DnD only (mobile users delete + re-add to relocate).

**Adding itinerary items** — each `TimeSlotGroup` renders an always-visible "+ Add" zone as the last child of the slot's droppable container. Clicking it opens `AddItemDialog` (a controlled component lifted to `DayColumn`) pre-selecting that slot. The zone also mirrors the parent slot's `isOver` drop state, so it doubles as the visual focal point for drag-over feedback — the actual drop target is still the full slot container, not the zone itself. `AddItemDialog` resets all form state on every closed→open transition so the dialog starts fresh no matter which slot was clicked.

**Hardcoded trip config** — all 16 days, cities, and transit flags live in `src/config/trip.ts`. `getDaysForCity(city)` and `CITY_MAP_CENTER` are used by the itinerary view.

**City colors** — the palette (`CITY_COLORS`) and helpers (`getCityColor`, `getHotelColor`) live in `src/config/trip.ts`. Each city has a `primary`/`tint` pair; cities with multiple hotels declare `variants` ordered by `check_in_date`. City-identity surfaces (city strip, day column header) use `getCityColor`; per-hotel surfaces (hotel pills, hotel map markers, logistics entries) use `getHotelColor` which resolves the variant.

**Speculative vs decided items** — itinerary items have an `is_decided` boolean. Decided items render with a solid, city-tinted border + shadow (`SortableItemCard` `variant="decided"` + `accentColor`); speculative items get a dashed muted border and no fill. Invariant: setting a `reservation_time` implies decided — enforced by `applyDecidedInvariantToInsert`/`applyDecidedInvariantToUpdate` in `src/types/itinerary.ts`, which wrap every `useCreateItineraryItem`/`useUpdateItineraryItem` payload. Clearing a reservation does NOT flip `is_decided` back. Transport items don't have the flag; they render decided (solid border) only when every leg is booked, otherwise speculative (dashed).

**Two-step unscheduled query** — PostgREST doesn't support subqueries. `useUnscheduledPlaces` (`src/hooks/useItinerary.ts`) fetches scheduled place IDs first, then excludes them in a second query.

**Optimistic drag-and-drop** — `useCrossItineraryDnD`, `useMoveItemToDay`, `useReorderDayItemsDynamic`, and `useReorderNotes` update the UI immediately and roll back on error. Droppable IDs encode both day and slot: `slot-{YYYY-MM-DD}-{slot}`. Whole card is the drag source everywhere — backlog cards and `SortableItemCard` both apply `{...listeners}` to the outer wrapper (no grip handle). **DnD is desktop-only**: sensors in `useCrossItineraryDnD` are gated by `useIsDesktop()` and the listeners spread on cards are no-ops on mobile, plus `sm:touch-none` keeps native touch scrolling working below 640px. `SortableItemCard` accepts an optional `onCardClick` that fires when the card body is tapped/clicked. On desktop the click region is an inner `role="button"` wrapper and the hover-reveal action tray sits outside it (no `stopPropagation` needed); on mobile the click is forwarded by `SwipeableCard` (`onForegroundClick`) and the foreground swallows it instead when a panel is open. Inline affordances inside the click zone (e.g. the reservation pill in `ItineraryItem`) still need `stopPropagation` on their `onClick`.

**Google Places caching** — place details are written to Supabase on first lookup (`useGooglePlaceDetails.ts`) to avoid redundant API calls.

**Data layer** — mutations and queries are co-located in hooks under `src/hooks/`. Components don't call Supabase directly.

**Unified place selection** — `AppShell` owns `selectedPlace` / `selectionOrigin` state. Three click surfaces converge: backlog card (`'backlog'`), map marker (`'marker'`), and day-column card (`'day-column'` — the whole card body is clickable). The overloaded `SelectPlaceHandler` type forces callers to provide an origin when setting a real place. Clicking a backlog card while the map is hidden auto-reveals it. On both desktop and mobile, the shared `DetailPanel` (sibling to `CityMap`) renders the place body when a place is selected — desktop slides it in below the map, mobile swaps it into the bottom region in place of the itinerary content. `DetailPanel` owns the close button and `Escape` dismiss; tapping empty map space also clears the selection. `UnscheduledColumn` highlights and auto-scrolls to the selected card (skipping scroll when origin is `'backlog'`). `PlaceEditDialog` is mounted once at AppShell level, driven by `editingPlace` state. `useScheduledDatesByPlace` is the bulk query powering marker badges — prefer it over the per-place `usePlaceSchedule` in list/map contexts.

**Transport (journeys + legs)** — `transport_items` is the parent row (day, time slot, sort order, optional title/notes); each leg lives in `transport_legs` (`mode`, inline `{origin,destination}_{name,place_id,lat,lng}`, `departure_time`/`arrival_time`, `is_booked` + optional `confirmation`, per-leg `notes`). A `Journey = { parent, legs }` aggregate (`src/types/transport.ts`) is the unit the UI works with everywhere — day column, map, logistics, edit dialog. `useAllJourneys` fetches with `.select('*, transport_legs(*)')`; `useCreateJourney` / `useUpdateJourney` / `useDeleteTransportItem` cover mutations (cascade on parent delete). `deriveJourneyDisplay` (`src/lib/transport-utils.ts`) derives the visible shape (first-origin → last-destination, earliest/latest times, booked count/total, mode list) from a journey. Mode styling (color + dash pattern + icon) lives in `src/config/transport.ts`. On the map, each leg renders as a `google.maps.Polyline` keyed off the mode style with endpoint markers (`src/components/map/TransportEndpointMarker.tsx`); legs missing coordinates just skip their polyline. AppShell's unified selection is a three-way mutual-exclusion over `selectedPlace` / `selectedHotel` / `selectedJourney`; selecting a journey fits `CityMap` bounds to all endpoints with symmetric padding (the sibling `DetailPanel` doesn't occlude the map, so no bias is needed). `TransportDialog` is the single add/edit surface (mounted at AppShell level for Logistics-originated edits, inline for day-column edits) — it wraps `TransportLegEditor` which handles the leg list + up/down reorder + prefill chain (new leg's origin ← previous destination, departure ← previous arrival, mode ← previous mode). Logistics renders a journey as a header row + non-interactive indented leg rows; only the pencil opens the edit dialog.

**Hotels** — `accommodations` rows carry the same rich-place fields as places (`google_place_id`, `photos`, `rating`, `tags`, `notes`, `phone`) on top of stay-specific columns (dates, times, confirmations, `booked_by`, `booking_url`). `AppShell` lifts `selectedHotel` and `editingHotel` state alongside the place equivalents, with mutual exclusion enforced in `handleSelectPlace` / `handleSelectHotel`. Selecting a hotel renders the shared `DetailPanel` (sibling to `CityMap`) with `kind: 'hotel'` so place and hotel detail surfaces are visually identical. `HotelEditDialog` is mounted once at AppShell level and driven by `editingHotel`; the Edit affordance lives in the detail panel and on every Logistics `HotelEntry` (both check-in and check-out). Hotels remain edit-only — creation and deletion still happen via SQL/seed migrations.

**Images** — multiple sources, two storage backends. Place and hotel photos come from Google (up to 5 per lookup) and are stored on `places.photos` / `accommodations.photos` as URL arrays; the first entry is canonical "primary" (see `markPrimaryPhoto` in `src/types/places.ts`). Freeform notes (`notes.images`) and text-note itinerary items (`itinerary_items.images`) store user-uploaded URLs. Uploads flow through `src/components/shared/ImageUploader.tsx` → compressed in-browser to 1600px JPEG 0.85 (`src/lib/image-compression.ts`) → uploaded to the public `trip-images` Supabase bucket under `{kind}/{ownerId}/` paths where `kind` is one of `places`, `notes`, `note-items`, or `hotels` (`src/lib/storage.ts`). The bucket has INSERT/UPDATE/DELETE policies for `anon` but no SELECT policy — images are served via direct public URL but can't be listed through the API. Paste-to-upload is wired via a document-level listener on `ImageUploader` so pastes into sibling inputs still reach it. Cascade cleanup on row delete is client-side in the mutation hooks (`useDeleteNote`, `useDeleteItineraryItem`, `useDeletePlace` via `deleteStorageObjects`) — fire-and-forget, errors logged. Non-Supabase URLs (Google photos) are filtered out of cleanup automatically. `CardBanner` (`src/components/shared/CardBanner.tsx`, formerly `PlaceCardBanner`) unifies the photo/icon-block anchor across backlog, day-column, and hotel cards: photo if available, otherwise tinted block with the category icon — callers pass resolved `colors` directly so hotels can use per-variant tints from `getHotelColor`. Two orientations: `'top'` (default, full-width header used by desktop and the backlog) and `'side'` (88px square used by the mobile day-column place row). Text-note and transport day-column items have no banner. `Lightbox` + `useLightbox` are shared between `PlaceDetail`, `HotelDetailContent`, `NoteEditor`, and `TextNoteDialog`. Text-note editing happens in `TextNoteDialog` (mirrors `ReservationDialog`) — opened via the pencil action on the card; no inline editing.

---

## Testing

Tests live in `src/test/`. The Vitest environment is `jsdom` with a `scrollIntoView` shim (`src/test/setup.ts`). Path alias `@/` → `src/` is available in tests via `vitest.config.ts`.
