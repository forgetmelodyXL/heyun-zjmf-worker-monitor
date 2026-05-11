CREATE TABLE IF NOT EXISTS providers (
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  api_account TEXT NOT NULL,
  api_password TEXT NOT NULL,
  jwt_token TEXT NOT NULL DEFAULT '',
  jwt_expire_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL REFERENCES providers(name),
  check_method TEXT NOT NULL DEFAULT 'api_only',
  enabled INTEGER NOT NULL DEFAULT 1,
  daily_reboot_limit INTEGER NOT NULL DEFAULT 0,
  scheduled_reboot TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS runtimes (
  server_id TEXT PRIMARY KEY REFERENCES servers(id),
  state TEXT NOT NULL DEFAULT 'healthy',
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  last_check_time INTEGER NOT NULL DEFAULT 0,
  last_reboot_time INTEGER NOT NULL DEFAULT 0,
  reboot_count_today INTEGER NOT NULL DEFAULT 0,
  reboot_date TEXT NOT NULL DEFAULT '',
  last_status_value TEXT NOT NULL DEFAULT '',
  state_changed_at INTEGER NOT NULL DEFAULT 0,
  first_failure_at INTEGER NOT NULL DEFAULT 0,
  reboot_initiated_at INTEGER NOT NULL DEFAULT 0,
  scheduled_reboot_date TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  old_state TEXT NOT NULL,
  new_state TEXT NOT NULL,
  label TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('check_interval', '300'),
  ('suspect_threshold', '3'),
  ('reboot_cooldown', '600'),
  ('recover_timeout', '300'),
  ('recover_check_interval', '60'),
  ('api_timeout', '60'),
  ('default_daily_reboot_limit', '3'),
  ('timezone', 'Asia/Shanghai'),
  ('webhook_url', ''),
  ('webhook_type', 'custom');
