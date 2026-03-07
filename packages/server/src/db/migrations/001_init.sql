-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,
  permissions TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  last_used   INTEGER
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id          TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  events      TEXT NOT NULL,
  secret      TEXT,
  active      INTEGER DEFAULT 1,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- Message Logs
CREATE TABLE IF NOT EXISTS message_logs (
  id          TEXT PRIMARY KEY,
  direction   TEXT NOT NULL,
  chat_id     TEXT NOT NULL,
  message_id  TEXT,
  type        TEXT NOT NULL,
  summary     TEXT,
  status      TEXT,
  timestamp   INTEGER NOT NULL,
  metadata    TEXT
);

-- Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS delivery_logs (
  id          TEXT PRIMARY KEY,
  webhook_id  TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  status_code INTEGER,
  success     INTEGER NOT NULL,
  attempt     INTEGER NOT NULL,
  error       TEXT,
  timestamp   INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_logs_timestamp ON message_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_chat_id ON message_logs(chat_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_webhook_id ON delivery_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_timestamp ON delivery_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
