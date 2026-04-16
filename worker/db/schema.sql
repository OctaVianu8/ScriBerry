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

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User settings
CREATE TABLE settings (
  user_id TEXT PRIMARY KEY,

  -- Appearance
  theme TEXT DEFAULT 'dark',                -- dark | light | system
  accent_color TEXT DEFAULT '#4f8ef7',      -- hex color
  font_size TEXT DEFAULT 'medium',          -- small | medium | large
  reduce_motion INTEGER DEFAULT 0,         -- 0 | 1

  -- Writing
  default_page TEXT DEFAULT 'journal',      -- journal | gym | reading
  auto_save_delay INTEGER DEFAULT 1000,     -- ms: 500 | 1000 | 2000
  editor_line_height TEXT DEFAULT 'comfortable', -- comfortable | compact | spacious
  spell_check INTEGER DEFAULT 1,           -- 0 | 1

  -- Calendar
  week_start_day TEXT DEFAULT 'monday',     -- monday | sunday
  show_empty_days INTEGER DEFAULT 0,        -- 0 | 1

  -- Notifications
  notifications_enabled INTEGER DEFAULT 0,  -- 0 | 1
  notification_time TEXT DEFAULT '21:00',   -- HH:MM
  notification_sound INTEGER DEFAULT 1,     -- 0 | 1

  -- Streaks & Goals
  gym_weekly_goal INTEGER DEFAULT 3,        -- 1-7
  show_streaks INTEGER DEFAULT 1,           -- 0 | 1

  -- Spotify
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  spotify_token_expires_at TEXT,
  spotify_username TEXT,
  spotify_avatar_url TEXT,
  spotify_auto_fetch INTEGER DEFAULT 1,     -- 0 | 1

  -- Profile
  display_name TEXT,

  -- Meta
  language TEXT DEFAULT 'en',               -- en | ro

  FOREIGN KEY (user_id) REFERENCES users(id)
);
