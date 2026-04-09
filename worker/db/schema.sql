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
