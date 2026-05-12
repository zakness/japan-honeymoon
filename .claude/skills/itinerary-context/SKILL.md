---
name: itinerary-context
description: >
  Loads the current state of the Japan honeymoon trip — places, hotels, journeys,
  day-by-day schedule, and freeform notes — into the conversation as markdown
  context, so the AI can help plan, brainstorm, critique, or fill out the
  itinerary based on what's actually there. Use this skill whenever the user
  asks for help with trip planning, gap-finding, day-shaping, restaurant /
  activity / sequencing suggestions, sanity-checking a day, or anything else
  where current trip state matters (e.g. "help me plan day 9 in Kyoto", "what's
  missing from Tokyo?", "is this dinner timing realistic?"). Also use when the
  user says "/itinerary-context" or otherwise explicitly invokes the skill.
---

# Itinerary context

This skill makes the current trip state available as markdown context. The export script reads from Supabase and writes per-city files into `exports/`, which is gitignored and regenerated on every run. Treat the result as a read-only snapshot.

## Step-by-step

**1. Regenerate the context.**

Run `npm run export-context` from the repo root. The script wipes and rewrites `exports/` in under ~1 second. If it fails:

- Missing env vars → confirm `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Network / Supabase errors → surface the error to the user and stop; do not proceed with stale data.

**2. Read `exports/README.md` first.**

It gives you the 15-day chronology table, top-line counts, the file map, and the conventions used throughout (⭐ = must-go, `[speculative]` = not yet decided, `## Archived` = intentionally rejected). Read this even if the conversation is narrowed to one city — it anchors the trip-wide context.

**3. Pull city files on demand.**

`exports/{tokyo,hakone,kyoto,naoshima,osaka}.md` each contain that city's full picture: overview · day-by-day schedule · scheduled places · backlog · hotels · journeys · archived. Read only the cities relevant to the current conversation. Cross-city journeys (e.g. Tokyo → Hakone shinkansen) appear in both endpoint files.

`exports/notes.md` holds freeform notes not tied to a city — pull it when the user references their notes or when planning-wide context is needed.

**4. Respect the read-only contract.**

- Do **not** edit anything under `exports/` — those files are regenerated and your edits would be silently overwritten.
- To actually change the trip data, use the app in the browser, or write to Supabase via the MCP tools. The export script never writes back.
- If the user asks you to "save", "add", or "schedule" something, the destination is Supabase, not the markdown.

## Conventions in the exports

- **⭐** marks a must-go place (an explicit upvote — `priority = 'must_go'`).
- **`[speculative]`** marks an itinerary item that is not yet decided. Items without that tag are decided / locked in. Setting a reservation time implies decided; clearing it does NOT flip it back.
- **`## Archived`** in each city file lists places the user has intentionally rejected. Do not re-pitch them as fresh ideas — they were considered and turned down. They appear for context so you understand prior thinking.
- **Time slots** are the seven-slot taxonomy used throughout the app: `Wake up` · `Breakfast` · `Morning` · `Lunch` · `Afternoon` · `Dinner` · `Evening`. Times that fall into a slot via the standard cutoffs are grouped under that slot's header.
- **Backlog** = unscheduled candidates for that city. Must-go entries come first, then default-priority entries alphabetically.
- **Children** under a place are sub-locations that "ride along" with the parent in the itinerary. Only the parent is ever scheduled directly; the children inherit its dates.
- **Photo URLs and raw IDs are intentionally omitted** from the exports — they have no value to a text-only agent. If the user references a place by Google ID or asks about photos, fall back to the app or Supabase MCP.

## When NOT to run this skill

- Pure code questions about the SPA itself (component refactors, bug fixes) — those don't need trip data context.
- Quick factual lookups the user can answer themselves ("what time is dinner on day 9?") — point them at the app or use Supabase MCP for a single targeted query rather than regenerating the whole export.
- After it's already been run this conversation, _unless_ the user indicates the data may have changed since (e.g. "I just added a few places — re-run it").
