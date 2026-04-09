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

## Remaining to build

### Auth
- [ ] ~~Google OAuth flow (Worker)~~ ✅
- [ ] ~~Apple ID flow (Worker)~~ ✅
- [ ] ~~Session cookie management~~ ✅
- [ ] ~~Auth middleware (protect all `/api/*` routes)~~ ✅
- [ ] ~~Frontend redirect to `/login` when unauthenticated~~ ✅

### Journal page
- [ ] Fetch/save entry from API
- [ ] TipTap toolbar (bold, italic, H1, H2)
- [ ] Song of the day (Spotify auto-fetch + manual fallback)
- [ ] Image upload to R2 via signed URL
- [ ] Audio record → R2 upload → Workers AI transcription
- [ ] Highlight field
- [ ] Auto-save with "Saved" indicator
- [ ] UI stubs: photo collage button, AI highlight button, song-based avatar

### Gym page
- [ ] Session type selector (pill buttons)
- [ ] Notes textarea + auto-save
- [ ] UI stub: weights & reps tracker section

### Reading page
- [ ] Book title field + notes textarea + auto-save

### Calendar page
- [ ] CalendarGrid component with activity dots
- [ ] Month navigation
- [ ] Day click → sidebar with links
- [ ] PDF export (week)

### Highlights page
- [ ] Month selector
- [ ] Vertical timeline rendering
- [ ] PDF export (month)

### Settings page
- [ ] All settings sections (account, appearance, notifications, calendar, general, Spotify)
- [ ] Push notification permission flow

### Worker modules
- [ ] All module route handlers (journal, gym, reading, media, push, settings)
- [ ] Auth middleware
- [ ] Streak calculation logic (`/api/streak`)
- [ ] Calendar endpoint (`/api/calendar`)
- [ ] Highlights endpoint (`/api/highlights`)
- [ ] Spotify OAuth + top-track endpoints
- [ ] R2 signed URL generation
- [ ] Workers AI Whisper transcription
- [ ] Cron: push notification sender

### Sidebar
- [ ] History list (last 30 days with per-day content indicators)
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
