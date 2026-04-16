# Scriberry — Progress

## Scaffolded (session 1 — 2026-04-09)

### Dependencies installed
- `react-router-dom` — routing
- `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` — rich text editor
- `vite-plugin-pwa` — PWA support
- `jspdf`, `html2canvas` — PDF export
- `wrangler` (dev) — Cloudflare CLI

### Frontend (`src/`)
- `main.tsx` — updated to use `RouterProvider`
- `App.tsx` — Sidebar + `<Outlet>` layout (no styling)
- `router.tsx` — all routes defined with `createBrowserRouter`
- `pages/Login.tsx` — placeholder (Google + Apple buttons, no logic)
- `pages/Journal.tsx` — placeholder
- `pages/Gym.tsx` — placeholder
- `pages/Reading.tsx` — placeholder
- `pages/Calendar.tsx` — placeholder
- `pages/Highlights.tsx` — placeholder
- `pages/Group.tsx` — "coming soon" placeholder
- `pages/Settings.tsx` — placeholder
- `components/Sidebar.tsx` — nav links, structure only
- `components/RichEditor.tsx` — TipTap wrapper wired up (no toolbar yet)
- `components/AudioRecorder.tsx` — placeholder (disabled button)
- `components/ImageUploader.tsx` — placeholder
- `components/CalendarGrid.tsx` — placeholder
- `hooks/useAutoSave.ts` — debounced save with status tracking
- `hooks/useStreak.ts` — placeholder
- `hooks/useNotifications.ts` — placeholder
- `api/index.ts` — typed fetch wrappers for all API endpoints

### Worker (`worker/`)
- `index.ts` — router-only entrypoint, dispatches to modules, handles cron
- `modules/auth/{index,queries}.ts` — placeholder (logout stub)
- `modules/journal/{index,queries}.ts` — placeholder
- `modules/gym/{index,queries}.ts` — placeholder
- `modules/reading/{index,queries}.ts` — placeholder
- `modules/media/{index,queries}.ts` — placeholder
- `modules/push/{index,queries}.ts` — placeholder
- `modules/settings/{index,queries}.ts` — placeholder
- `cron/notifications.ts` — placeholder
- `db/schema.sql` — full D1 schema (users, journal, gym, reading, push, settings)

### Config
- `wrangler.toml` — D1 binding (`DB`), R2 binding (`BUCKET`), cron trigger, placeholder IDs
- `vite.config.ts` — `vite-plugin-pwa` configured (name "Scriberry", dark theme color `#0a0a0a`, network-first for `/api/*`, cache-first for static assets, 192+512 icons)
- `index.html` — title updated to "Scriberry"
- `public/icons/` — folder created, icons not yet added

---

## Session 2 — Auth (2026-04-09)

### Worker (`worker/`)
- `worker/db/schema.sql` — added `sessions` table
- `worker/modules/auth/queries.ts` — `upsertUserByEmail`, `getSessionById`, `createSession`, `deleteSession`
- `worker/modules/auth/index.ts` — full OAuth implementation:
  - `GET /api/auth/google` → redirect to Google
  - `GET /api/auth/google/callback` → exchange code, create session, redirect
  - `GET /api/auth/apple` → redirect to Apple (response_mode: form_post)
  - `POST /api/auth/apple/callback` → verify id_token (RS256 via Apple JWKS), create session, redirect
  - `GET /api/auth/me` → return user JSON or 401
  - `POST /api/auth/logout` → delete session, clear cookie
  - `getAuthenticatedUserId` — exported middleware used in worker/index.ts
  - Apple client_secret generated on-the-fly (ES256 JWT signed with P8 key via WebCrypto)
  - State CSRF: `oauth_state` cookie (`SameSite=None;Secure` for Apple POST callback)
- `worker/index.ts` — auth middleware integrated; all non-auth `/api/*` routes now pass `userId` to handlers; `Env` interface updated with all OAuth secrets
- All 6 module handlers updated to accept `userId: string` as third param

### Frontend (`src/`)
- `src/context/AuthContext.tsx` — `AuthProvider` + `useAuthContext`; fetches `/api/auth/me` on mount; exposes `{ user, loading, logout }`
- `src/hooks/useAuth.ts` — re-exports `useAuthContext` as `useAuth`
- `src/pages/Login.tsx` — dark minimal sign-in page; Google + Apple SVG icons; redirects away if already authenticated
- `src/App.tsx` — shows loading screen → redirects `/login` if unauthenticated → renders Sidebar + Outlet
- `src/main.tsx` — wrapped with `AuthProvider`
- `src/api/index.ts` — added `authApi.me`

### Config
- `wrangler.toml` — `APP_URL`, `GOOGLE_CLIENT_ID`, `APPLE_*` vars; commented instructions for secrets

### Secrets to set before deploying
```
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put APPLE_PRIVATE_KEY    # full .p8 file contents
```

---

---

## Session 3 — Journal page (2026-04-10)

### Worker (`worker/`)
- `worker/modules/journal/queries.ts` — `getEntryByDate`, `upsertEntry` (ON CONFLICT upsert), `getHistory` (last 90 days), `getImagesByEntryDate`, `saveJournalImage`
- `worker/modules/journal/index.ts` — all routes:
  - `GET /api/journal/history`
  - `GET /api/journal/:date`
  - `PUT /api/journal/:date` — upsert entry
  - `GET /api/journal/:date/images`
  - `POST /api/journal/:date/images`
- `worker/modules/media/index.ts` — all routes:
  - `POST /api/media/upload-url` — allocate R2 key, return upload URL
  - `PUT /api/media/upload/:key` — stream file body to R2
  - `GET /api/media/file/:key` — serve from R2 (session-authenticated)
  - `POST /api/audio/transcribe` — Workers AI Whisper → transcript
- `worker/index.ts` — added `AI` binding to `Env`, added `/api/audio` route (routed to `handleMedia`)

### Frontend (`src/`)
- `src/api/index.ts` — added `journalApi.getImages`, `journalApi.saveImage`, `mediaApi.uploadFile`, `audioApi.transcribe`
- `src/hooks/useAutoSave.ts` — auto-resets from 'saved' → 'idle' after 2.5 s
- `src/components/RichEditor.tsx` — full rewrite:
  - TipTap StarterKit (Bold, Italic, Heading H1/H2, Paragraph)
  - Custom CSS injected once (Georgia serif, dark palette, warm text)
  - Desktop: floating bubble toolbar (manual selection tracking via `window.getSelection()`)
  - Mobile: fixed bottom toolbar (`position: fixed; bottom: 0`)
  - Accepts `initialContent` (TipTap JSON string), `onChange`, `onEditorReady`
- `src/components/ImageUploader.tsx` — full rewrite:
  - Asymmetric masonry grid (`columns` CSS property)
  - Upload flow: `POST /api/media/upload-url` → `PUT uploadUrl` → `POST /api/journal/:date/images`
  - Supports multiple file selection
- `src/components/AudioRecorder.tsx` — full rewrite:
  - Record via `MediaRecorder` API or upload audio file
  - Animated recording dot while recording
  - Sends to `POST /api/audio/transcribe`, inserts transcript at cursor
- `src/pages/Journal.tsx` — full implementation:
  - Dark, distraction-free writing surface (max-width 720px, centered)
  - Date header (weekday + long date in warm serif)
  - Song of the day (inline icon + title + artist inputs)
  - Optional entry title
  - TipTap rich editor (RichEditor component)
  - Highlight callout (gold left-border, italic serif, amber tint)
  - Image masonry grid + upload
  - Audio recorder / transcription
  - Auto-save debounced 1000ms; "Saved ✓" indicator (fixed top-right, fades)
  - Loads entry + images on mount; remounts editor when date changes

### Config / infra
- Workers AI `AI` binding must be added in Cloudflare Pages → Settings → Functions → Workers AI Bindings (variable name: `AI`)

---

---

## Session 4 — Design system + Journal redesign (2026-04-11)

### Design system (`src/styles/`)
- `tokens.css` — all CSS custom properties: colors (`--c-*`), fonts (`--f-*`), type scale (`--t-*`), spacing (`--sp-*`), radii (`--r-*`), transitions (`--ease-*`), layout (`--journal-max-width`, `--toolbar-height`)
- `global.css` — full reset, body/html base, `#root` (fixed text-align center bug), scrollbar, selection, input/button resets
- `components.css` — global reusable classes: `.sb-toolbar`, `.sb-toolbar-btn`, `.sb-editor`, `.sb-highlight-wrap`, `.sb-song-row`, `.sb-saved`, `.sb-image-grid`, `.sb-ghost-btn`, etc.
- `src/index.css` — replaced entirely; now just imports the three CSS layers
- `index.html` — added Google Fonts: Fraunces (variable opsz serif for display) + Inter (UI)

### Bugs fixed
- **Editor text centered** — root cause: `text-align: center` on `#root` in old `index.css`. Fixed in `global.css`.
- **Toolbar not visible on desktop** — previous implementation was a bubble menu (only appeared on text selection). Replaced with a persistent always-visible toolbar pinned directly above the editor, visible on all screen sizes. Uses `onMouseDown` + `e.preventDefault()` to preserve selection while clicking buttons.

### Component rewrites
- `RichEditor.tsx` — toolbar is now always-visible (no bubble, no media-query toggle). Uses SVG icons for Bold/Italic/Paragraph, text labels for H1/H2. Active state via `is-active` CSS class. `text-align: left !important` in CSS prevents any centering.
- `ImageUploader.tsx` — uses global `.sb-*` classes; masonry rotation applied via `nth-child` CSS in `components.css` (no JS).
- `AudioRecorder.tsx` — uses `.sb-ghost-btn`, token variables.

### Journal page (`src/pages/Journal.tsx` + `Journal.module.css`)
- Date header: Fraunces variable font, large weight-300 display; day number bold, month/year italic
- Song field: inline metadata row with SVG music icon, plain inputs styled as text
- Title input: Fraunces, generous size, no border
- Editor: persistent toolbar → borderless editor surface inside `.sb-editor-wrap`
- Highlight: left gold border + amber tint + Fraunces italic textarea
- Loading skeleton: correctly sized placeholder while API loads
- Saved indicator: monospace, fixed top-right, opacity-only transition

---

## Session 5 — Gym & Reading pages (2026-04-16)

### Design system extractions (`src/styles/components.css`)
- Extracted `.sb-page` / `.sb-page-inner` — shared page shell (replaces per-page `.page`/`.inner`)
- Extracted `.sb-date-weekday` / `.sb-date-display` — shared date header styles
- Added `.sb-pill-group` / `.sb-pill` — single-select pill button row with `data-selected`, `data-muted` variants
- Added `.sb-textarea` — auto-grow dark textarea with focus ring
- Added `.sb-title-input` — borderless prominent title-style input
- Added `.sb-coming-soon` — dashed stub card with lock icon
- Added `.sb-section-label` — uppercase muted section heading

### Shared components
- `src/components/DateHeader.tsx` — reusable date header (weekday + day/month/year), exports `todayISO` and `formatDate`
- `src/components/SaveIndicator.tsx` — reusable saved/saving/error indicator
- `src/hooks/useAutoGrow.ts` — auto-resize textarea hook

### Backend (`worker/`)
- `worker/modules/gym/queries.ts` — `getSessionByDate`, `upsertSession` (ON CONFLICT upsert), `getHistory` (last 90 days with session_type)
- `worker/modules/gym/index.ts` — `GET /api/gym/:date`, `PUT /api/gym/:date`, `GET /api/gym/history`
- `worker/modules/reading/queries.ts` — `getLogByDate`, `upsertLog` (ON CONFLICT upsert), `getHistory` (last 90 days with book_title)
- `worker/modules/reading/index.ts` — `GET /api/reading/:date`, `PUT /api/reading/:date`, `GET /api/reading/history`

### Frontend (`src/`)
- `src/pages/Gym.tsx` — full implementation:
  - Date header (shared DateHeader component)
  - Session type pill selector: Push / Pull / Legs / Arms / Cardio / Rest (Rest is visually muted)
  - Notes textarea with auto-grow
  - Auto-save debounced 1000ms with SaveIndicator
  - Coming soon stub: weights & reps tracker (lock icon + label)
  - Loading skeleton
- `src/pages/Reading.tsx` — full implementation:
  - Date header (shared DateHeader component)
  - Book title field (prominent, borderless, sb-title-input)
  - Notes textarea with auto-grow
  - Auto-save debounced 1000ms with SaveIndicator
  - Loading skeleton
- `src/api/index.ts` — added `gymApi.history()`, `readingApi.history()`

### Journal page refactor
- Migrated to shared `sb-page`, `sb-page-inner`, `sb-title-input` classes
- Replaced inline SavedIndicator/formatDate/todayISO with shared components
- Removed duplicated CSS from `Journal.module.css` (date header, page shell, title input styles)

---

## Session 6 — Calendar page + Sidebar history (2026-04-16)

### Worker (`worker/`)
- `worker/modules/calendar/queries.ts` — `getMonthActivity`: single D1 query across journal_entries, gym_sessions, reading_logs using UNION + LEFT JOINs, returns per-day boolean flags
- `worker/modules/calendar/index.ts` — `GET /api/calendar?month=YYYY-MM` route handler
- `worker/index.ts` — added calendar route dispatch

### Frontend (`src/`)
- `src/pages/Calendar.tsx` — full implementation:
  - Month/year header with chevron navigation
  - 7-column Mon–Sun grid with padding days from prev/next months
  - Activity dots per day: blue (journal), green (gym), orange (reading)
  - Today highlighted with accent border
  - Days with content: bright, clickable; days without: muted, not clickable
  - Outside-month and future days: very muted, non-interactive
  - Weekends: subtle background difference
  - Day click opens popover with links to that day's Journal/Gym/Reading (only activities with entries)
  - Mobile: popover renders as bottom sheet with backdrop
  - Tap outside closes popover
- `src/pages/Calendar.module.css` — full styles: grid layout, day cells, dots, popover, mobile bottom sheet
- `src/components/Sidebar.tsx` — history section rewritten:
  - Uses `/api/calendar` endpoint instead of journal-only history
  - Only shows days that have at least one entry (no empty days)
  - Colored dots per activity (blue=journal, green=gym, orange=reading)
  - Days with no content are completely hidden
- `src/components/Sidebar.module.css` — updated dot styles with `data-color` variants

---

## Remaining to build

### Auth
- [ ] ~~Google OAuth flow (Worker)~~ ✅
- [ ] ~~Apple ID flow (Worker)~~ ✅
- [ ] ~~Session cookie management~~ ✅
- [ ] ~~Auth middleware (protect all `/api/*` routes)~~ ✅
- [ ] ~~Frontend redirect to `/login` when unauthenticated~~ ✅

### Journal page
- [ ] ~~Fetch/save entry from API~~ ✅
- [ ] ~~TipTap toolbar (bold, italic, H1, H2)~~ ✅
- [ ] ~~Song of the day (manual input)~~ ✅
- [ ] ~~Image upload to R2~~ ✅
- [ ] ~~Audio record → Workers AI transcription~~ ✅
- [ ] ~~Highlight field~~ ✅
- [ ] ~~Auto-save with "Saved" indicator~~ ✅
- [ ] Spotify auto-fetch for song of the day (future)

### Gym page
- [ ] ~~Session type selector (pill buttons)~~ ✅
- [ ] ~~Notes textarea + auto-save~~ ✅
- [ ] ~~UI stub: weights & reps tracker section~~ ✅
- [ ] Weights & reps tracker (actual implementation — future)

### Reading page
- [ ] ~~Book title field + notes textarea + auto-save~~ ✅

### Calendar page
- [ ] ~~CalendarGrid component with activity dots~~ ✅
- [ ] ~~Month navigation~~ ✅
- [ ] ~~Day click → popover with links~~ ✅
- [ ] PDF export (week)

### Highlights page
- [ ] Month selector
- [ ] Vertical timeline rendering
- [ ] PDF export (month)

### Settings page
- [ ] All settings sections (account, appearance, notifications, calendar, general, Spotify)
- [ ] Push notification permission flow

### Worker modules
- [ ] ~~All module route handlers (journal, gym, reading)~~ ✅
- [ ] Module route handlers (media, push, settings)
- [ ] Auth middleware
- [ ] Streak calculation logic (`/api/streak`)
- [ ] ~~Calendar endpoint (`/api/calendar`)~~ ✅
- [ ] Highlights endpoint (`/api/highlights`)
- [ ] Spotify OAuth + top-track endpoints
- [ ] R2 signed URL generation
- [ ] Workers AI Whisper transcription
- [ ] Cron: push notification sender

### Sidebar
- [ ] ~~History list (days with content + colored activity dots)~~ ✅
- [ ] User avatar + name
- [ ] Streak counters (journal / gym / reading)
- [ ] Mobile collapse (hamburger / bottom nav)

### PWA
- [ ] Add actual icon files (192x192 and 512x512) to `public/icons/`
- [ ] Offline fallback page

### Infrastructure
- [ ] Create real D1 database and update `wrangler.toml` with real ID
- [ ] Create R2 bucket
- [ ] Set VAPID keys as Worker secrets
- [ ] Cloudflare Pages deployment config
