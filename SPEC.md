# Scriberry — Project Specification

## Overview

A personal Progressive Web App (PWA) for daily journaling and habit tracking during an Erasmus semester. Built with React + Vite + TypeScript, hosted on Cloudflare Pages, with a Cloudflare Workers backend and D1 (SQLite) database.

The app starts as single-user (me), but is architected from the start to support multiple users and a shared group journal feature in the future. Authentication is required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Hosting | Cloudflare Pages |
| Backend | Cloudflare Workers (API routes) |
| Database | Cloudflare D1 (SQLite) |
| Object storage | Cloudflare R2 (images, audio files) |
| Auth | Google OAuth + Apple ID (via Cloudflare Access or Auth.js) |
| STT | Cloudflare Workers AI (Whisper model) |
| Push notifications | Web Push API (VAPID) |
| PWA | Vite PWA plugin (vite-plugin-pwa) |

---

## Architecture

### Topology (Modular Monolith)

```
Frontend (Pages)
    ↓ /api/*
Cloudflare Worker (single deployment, modular code)
    ├── auth module
    ├── journal module
    ├── gym module
    ├── reading module
    ├── media module    → R2 (images, audio)
    ├── ai module       → Workers AI (Whisper)
    └── push module     → Web Push API
         ↓
        D1 (SQLite) — text and metadata only
```

The frontend calls `/api/*` endpoints. The Worker is a full router that handles auth, business logic, and communication with all services. Everything runs on Cloudflare's edge — no external server, no separate VPS.

### Why a single Worker and not a traditional backend server?

The Worker **is** the backend server. The architecture is still the classic 3-tier model:
```
Frontend → Backend (Worker) → Services (D1, R2, Workers AI, external APIs)
```
The difference is that the backend is deployed as an edge function instead of a long-running process on a VPS. The Worker is not a tiny single-purpose lambda — it is a full router with modules for each domain.

### Storage split: D1 vs R2

- **D1** stores all text and metadata: journal content, highlights, gym sessions, reading logs, user settings, URLs pointing to R2 objects.
- **R2** stores all binary files: images and audio recordings. Files are uploaded directly to R2 via a signed URL, and only the resulting R2 URL is stored in D1.

This keeps D1 fast and lean, and avoids storing large blobs in a SQL database.

### Migration path to microservices

This is a **modular monolith**: the code is separated into clean domain modules inside a single Worker deployment. This is intentional — it allows migrating to a microservices architecture later with minimal effort.

When a module needs to become its own service (e.g. due to scale or independent deployment needs), the process is:

1. Move the module folder to its own Worker project with its own `wrangler.toml`
2. Deploy it as a separate Worker
3. Replace the direct function call in the main Worker with a **Service Binding** call:

```ts
// Before — direct call within same Worker
import { handleMedia } from './media'
handleMedia(request)

// After — Service Binding to separate Worker
env.MEDIA_SERVICE.fetch(request)
```

The logic inside the module does not change. Only the deployment boundary changes. Service Bindings are zero-latency Worker-to-Worker calls within Cloudflare's network — no HTTP overhead.

### Rules that make this migration painless

These must be followed during development or migration becomes painful:

1. **Modules never import from each other's internals.** If journal needs something from media, it calls a function defined in that module's public interface — never reaches into its internal state or DB queries.
2. **Each module owns its DB queries.** No cross-module SQL joins. If journal needs media data, it calls the media module's function, which runs its own query.
3. **No shared mutable state between modules.** Each module is stateless and gets everything it needs from D1/R2 or the incoming request.

### Future topology (Microservices)

```
Frontend (Pages)
    ↓
Router Worker (auth + request routing)
    ├── Journal Worker  → D1
    ├── Gym Worker      → D1
    ├── Reading Worker  → D1
    ├── Media Worker    → R2
    ├── AI Worker       → Workers AI
    └── Push Worker     → Web Push API
```

### Planned future feature: Shared Group Journal

A collaborative photo and caption journal for groups (e.g. Erasmus friend groups). This is architecturally distinct from the personal journal and will be built as a separate module (and eventually a separate Worker in Option B).

**v1 scope (shared album):**
- A user creates a Group and gets an invite link
- Members join via the invite link
- Anyone in the group can upload photos and captions for a given day
- Read access for all members, no permission tiers in v1

**Why this is separate from the personal journal:**
- Different data model (group ownership, multiple authors per entry)
- Requires invite/membership management
- Potential for real-time or near-real-time sync between members

**DB tables needed (future, do not implement now):**
```sql
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE group_members (
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_entries (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  caption TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE group_images (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  r2_url TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## Authentication

- Sign in with **Google OAuth**
- Sign in with **Apple ID**
- Session stored in a secure HTTP-only cookie
- All `/api/*` routes require authentication
- Frontend redirects to login if unauthenticated

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Journal entries (one per day per user)
CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- ISO date: YYYY-MM-DD
  title TEXT,
  content TEXT, -- rich text stored as JSON (TipTap/ProseMirror format)
  highlight TEXT, -- short summary for monthly reel
  song_title TEXT,
  song_artist TEXT,
  song_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Images attached to journal entries
-- Actual files stored in R2; only the R2 URL is stored here
CREATE TABLE journal_images (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  r2_url TEXT NOT NULL,
  caption TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id)
);

-- Audio recordings attached to journal entries
-- Actual files stored in R2; only the R2 URL is stored here
CREATE TABLE journal_audio (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  r2_url TEXT NOT NULL,
  transcript TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id)
);

-- Gym sessions (one per day per user)
CREATE TABLE gym_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  session_type TEXT NOT NULL, -- push | pull | legs | arms | cardio | rest
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Reading logs (one per day per user)
CREATE TABLE reading_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  book_title TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription TEXT NOT NULL, -- JSON Web Push subscription object
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User settings
CREATE TABLE settings (
  user_id TEXT PRIMARY KEY,
  notification_time TEXT DEFAULT '21:00', -- HH:MM
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  spotify_token_expires_at TEXT,
  week_start_day TEXT DEFAULT 'monday', -- monday | sunday
  default_page TEXT DEFAULT 'journal',  -- journal | gym | reading
  language TEXT DEFAULT 'en',           -- en | ro
  theme TEXT DEFAULT 'dark',            -- dark | light
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Pages & Routing

```
/                   → redirects to /journal/today
/login              → login page (Google + Apple buttons)
/journal            → redirects to /journal/today
/journal/today      → today's journal entry (create or open)
/journal/:date      → journal entry for a specific date (YYYY-MM-DD)
/gym                → redirects to /gym/today
/gym/today          → today's gym session
/gym/:date          → gym session for a specific date
/reading            → redirects to /reading/today
/reading/today      → today's reading log
/reading/:date      → reading log for a specific date
/calendar           → calendar view
/highlights         → monthly highlight reel
/settings           → user settings
```

---

## Layout

### Sidebar (persistent, collapsible on mobile)
- Top: app logo / name
- Feature links: Journal, Gym, Reading
- Divider
- History: list of past entries (last 30 days), grouped by date, showing which pages have content for that day
- Bottom: Settings link, user avatar + name, streak counter

### Main content area
- Full width on mobile (sidebar collapses to bottom nav or hamburger)
- Page content rendered here

---

## Feature Pages

### Journal Page (`/journal/:date`)

**Layout:**
- Date header (e.g. "Tuesday, 1 April")
- Song of the day field — auto-fetched from Spotify API (most listened track that day). Requires Spotify to be connected in Settings. Falls back to manual input if not connected.
- Rich text editor (TipTap recommended):
  - Supports: Title, H1, H2, paragraph text
  - Formatting: bold, italics
- Image upload section (multiple images per entry, uploaded to R2)
- Audio recorder / upload section (uploaded to R2, transcribed via Workers AI)
- Highlight field (short text, shown in monthly reel)

**Behaviors:**
- Auto-save on change (debounced, 1s)
- Speech-to-text button inserts transcribed text at cursor position
- If today and no highlight written → show subtle prompt (not AI-generated yet, just a UI nudge)

**TODO (build UI stub, no logic):**
- Photo collage / video generation button (disabled, "Coming soon")
- AI highlight suggestion button (disabled, "Coming soon")
- Song-based avatar (placeholder avatar shown)

### Gym Page (`/gym/:date`)

- Date header
- Session type selector: Push / Pull / Legs / Arms / Cardio / Rest (single select, styled as pill buttons)
- Notes field (plain textarea)
- Auto-save

**TODO (build UI stub, no logic):**
- Weights & reps tracker (disabled section, "Coming soon")

### Reading Page (`/reading/:date`)

- Date header
- Book title field
- Notes field (what did I read today, plain textarea)
- Auto-save

### Calendar Page (`/calendar`)

- Monthly calendar grid
- Each day shows colored dots/icons for which pages have content:
  - Blue dot = journal entry exists
  - Green dot = gym session exists
  - Orange dot = reading log exists
- Click a day → opens sidebar with links to that day's pages
- Navigate between months

### Highlight Reel (`/highlights`)

- Month selector
- Shows all daily highlights for that month in a vertical timeline
- Each entry shows: date and highlight text as the main content, with the first image small and to the side (thumbnail, not full width)
- Export month to PDF button

### Settings (`/settings`)

- **Account** — name, email, avatar, sign out button
- **Appearance** — light / dark mode toggle; language selector (EN / RO)
- **Notifications** — enable/disable push notifications toggle (triggers Web Push permission request); notification time picker (default 21:00)
- **Calendar** — week start day (Monday / Sunday)
- **General** — default landing page on open (Journal / Gym / Reading)
- **Spotify** — Connect Spotify button (initiates OAuth); shows connected account name if already connected; disconnect button

---

## API Endpoints (Cloudflare Worker)

```
GET    /api/journal/:date         → get entry for date
PUT    /api/journal/:date         → create or update entry for date
GET    /api/journal/history       → list of dates with entries (last 90 days)

GET    /api/gym/:date             → get gym session for date
PUT    /api/gym/:date             → create or update gym session

GET    /api/reading/:date         → get reading log for date
PUT    /api/reading/:date         → create or update reading log

GET    /api/calendar?month=YYYY-MM → all activity for a month

POST   /api/media/upload-url        → get a signed R2 upload URL (client uploads directly to R2)
DELETE /api/media/:id               → delete a file from R2 and its DB record

POST   /api/push/subscribe        → save push subscription
DELETE /api/push/subscribe        → remove push subscription

GET    /api/settings              → get user settings
PUT    /api/settings              → update user settings

GET    /api/highlights?month=YYYY-MM → get all highlights for month
GET    /api/streak                → returns current streak count

GET    /api/spotify/top-track?date=YYYY-MM-DD → fetch most listened track for that day from Spotify API
GET    /api/spotify/auth                     → initiate Spotify OAuth flow
GET    /api/spotify/callback                 → Spotify OAuth callback, store tokens


POST   /api/auth/logout           → clear session
```

---

## Streak Logic

Streaks are tracked per activity and have different rules:

- **Journal streak** — counts consecutive days with a journal entry
- **Gym streak** — counts consecutive weeks with at least 3 gym sessions (Rest does not count as a session)
- **Reading streak** — counts consecutive days with a reading log entry

All three streaks are displayed separately in the sidebar. Calculated server-side on `/api/streak`.

---

## Push Notifications

- Uses Web Push API with VAPID keys stored as Worker secrets
- A Cloudflare Cron Trigger fires at e.g. 18:00 UTC daily
- Worker checks each user's `notification_time` setting and sends notifications to users whose local time matches
- Notification text: *"Don't forget to write in your journal today 📓"*
- On click → opens `/journal/today`

---

## PWA Configuration

Using `vite-plugin-pwa`:
- App name: "Scriberry"
- Theme color: dark (match app aesthetic)
- Icons: 192x192 and 512x512 (to be added to `/public/icons/`)
- Offline fallback page
- `display: standalone` (feels native on mobile)
- Cache strategy: network-first for API, cache-first for static assets

---

## Export to PDF

PDF export is available at the week and month level only — not per individual day.

- **Highlight reel page** — export current month to PDF
- **Calendar page** — export selected week to PDF

Use `jsPDF` + `html2canvas` on the frontend. Each exported page includes: date, journal text, highlight, song of the day, and thumbnail images.

---

## TODO Features (build UI stubs only, no logic)

These should appear in the UI as clearly marked "Coming soon" disabled elements:

1. **Photo collage / video generation** — button on journal page image section
2. **AI highlight suggestion** — button next to highlight field
3. **Song-based avatar** — placeholder in song of the day section
4. **Weights & reps tracker** — disabled section on gym page
5. **Shared group journal** — nav item in sidebar ("Group Journal"), leads to a placeholder page explaining the feature is coming soon. Route: `/group`

---

## File Structure

```
journal/
├── public/
│   ├── icons/          ← PWA icons
│   └── manifest.json   ← auto-generated by vite-plugin-pwa
├── src/
│   ├── components/     ← shared UI components
│   │   ├── Sidebar.tsx
│   │   ├── RichEditor.tsx   ← TipTap wrapper
│   │   ├── AudioRecorder.tsx
│   │   ├── ImageUploader.tsx
│   │   └── CalendarGrid.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Journal.tsx
│   │   ├── Gym.tsx
│   │   ├── Reading.tsx
│   │   ├── Calendar.tsx
│   │   ├── Highlights.tsx
│   │   ├── Group.tsx        ← coming soon placeholder
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useAutoSave.ts
│   │   ├── useStreak.ts
│   │   └── useNotifications.ts
│   ├── api/            ← typed fetch wrappers for each endpoint
│   ├── router.tsx      ← React Router config
│   ├── App.tsx
│   └── main.tsx
├── worker/
│   ├── index.ts        ← Cloudflare Worker entrypoint (router only)
│   ├── modules/        ← one folder per domain (future Service Binding boundary)
│   │   ├── auth/
│   │   │   ├── index.ts
│   │   │   └── queries.ts
│   │   ├── journal/
│   │   │   ├── index.ts
│   │   │   └── queries.ts
│   │   ├── gym/
│   │   │   ├── index.ts
│   │   │   └── queries.ts
│   │   ├── reading/
│   │   │   ├── index.ts
│   │   │   └── queries.ts
│   │   ├── media/          ← handles R2 signed URLs + transcription
│   │   │   ├── index.ts
│   │   │   └── queries.ts
│   │   ├── push/
│   │   │   ├── index.ts
│   │   │   └── queries.ts
│   │   └── settings/
│   │       ├── index.ts
│   │       └── queries.ts
│   ├── db/
│   │   └── schema.sql
│   └── cron/
│       └── notifications.ts
├── wrangler.toml
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Notes for Implementation

- Use **React Router v6** with `createBrowserRouter`
- Use **TipTap** for the rich text editor (has TypeScript support, extensible)
- All dates stored and handled as `YYYY-MM-DD` strings (no timezone issues)
- Keep the aesthetic dark, minimal, mobile-first
- Auto-save should debounce at 1000ms and show a subtle "Saved" indicator
- All API calls should include the session cookie automatically (fetch with `credentials: 'include'`)
- Images and audio are uploaded directly to R2 via a signed URL obtained from `/api/media/upload-url`. The Worker never proxies the file itself — only issues the URL and stores the resulting R2 key in D1.
- Worker `index.ts` is a router only — it imports from modules and dispatches requests. It contains no business logic itself.
- Modules must never import from each other's internals. Cross-module communication goes through the module's exported public functions only. This is the key rule that makes future migration to Service Bindings painless.
- **Maintain a `PROGRESS.md` file at the project root.** After completing each feature or logical unit of work, update it with: what was built, what files were created or modified, and what remains. Start every new session by reading `PROGRESS.md` before doing anything else. This keeps context compact across sessions. Keep `PROGRESS.md` concise — bullet points only, no prose. If it exceeds 1000 lines, create `PROGRESS_2.md` with the full previous content summarized to under 200 lines, and continue fresh in `PROGRESS_2.md`.