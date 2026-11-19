BEGIN;
CREATE TABLE IF NOT EXISTS live_rooms (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{32}$'),
  host_hash text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','complete','interrupted')),
  last_seq integer NOT NULL DEFAULT -1,
  bytes integer NOT NULL DEFAULT 0,
  last_frame_ms integer NOT NULL DEFAULT 0,
  CHECK (expires_at <= created_at + interval '7 days')
);
CREATE INDEX IF NOT EXISTS live_rooms_expiry ON live_rooms(expires_at);
CREATE TABLE IF NOT EXISTS live_chunks (
  room_id text NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  seq integer NOT NULL CHECK (seq >= 0),
  payload jsonb NOT NULL,
  digest text NOT NULL,
  PRIMARY KEY(room_id,seq)
);
-- Run by the Worker cron every five minutes; cascade physically deletes chunks.
-- Reads always enforce expires_at > now(), independently of cleanup availability.
COMMIT;
