-- Escrow Oracle Database Schema
-- Run this against your Postgres instance (Neon/Supabase/Railway)

-- Track last processed block per network
CREATE TABLE IF NOT EXISTS cursor (
  network TEXT PRIMARY KEY,
  last_block BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registry of all escrows we're watching
CREATE TABLE IF NOT EXISTS escrows (
  escrow BYTEA PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  network TEXT NOT NULL,
  expected_funder BYTEA,
  expected_confirmer BYTEA,
  phase_cached SMALLINT DEFAULT 0,
  created_tx TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deduplication: track processed transactions
CREATE TABLE IF NOT EXISTS processed_tx (
  tx_hash TEXT PRIMARY KEY,
  escrow BYTEA,
  event_type TEXT,
  seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- DM confirmation flags (for Phase 6)
CREATE TABLE IF NOT EXISTS dm_flags (
  escrow BYTEA PRIMARY KEY,
  funder_confirmed BOOLEAN DEFAULT FALSE,
  confirmer_confirmed BOOLEAN DEFAULT FALSE,
  refund_requested BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (escrow) REFERENCES escrows(escrow) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_escrows_code ON escrows(code);
CREATE INDEX IF NOT EXISTS idx_escrows_network ON escrows(network);
CREATE INDEX IF NOT EXISTS idx_escrows_phase ON escrows(phase_cached);
CREATE INDEX IF NOT EXISTS idx_processed_tx_escrow ON processed_tx(escrow);
CREATE INDEX IF NOT EXISTS idx_processed_tx_seen_at ON processed_tx(seen_at);

-- Insert default cursor for supported networks
INSERT INTO cursor (network, last_block) VALUES ('421614', 0) ON CONFLICT DO NOTHING;
INSERT INTO cursor (network, last_block) VALUES ('42161', 0) ON CONFLICT DO NOTHING;

