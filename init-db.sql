-- Initialize database schema for auxiliary tables (tables not managed by Ponder)

-- Create jobs table for the queue
CREATE TABLE auction_jobs (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,  -- References auctionEvents.id (managed by Ponder)
  type TEXT NOT NULL, -- 'enrich_event' 
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  attempts INTEGER NOT NULL DEFAULT 0,
  data JSONB, -- job-specific data
  error TEXT, -- error message if it failed
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Create index for faster job querying
  CONSTRAINT unique_pending_job UNIQUE (event_id, type, status)
);

CREATE INDEX idx_jobs_status ON auction_jobs(status, updated_at);

-- Create ens_cache table
CREATE TABLE ens_cache (
  address TEXT PRIMARY KEY,
  ens_name TEXT,
  last_checked_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create eth_price_cache table 
CREATE TABLE eth_price_cache (
  timestamp INTEGER PRIMARY KEY, -- Unix timestamp rounded to nearest hour
  price_usd NUMERIC NOT NULL,
  source TEXT NOT NULL, -- Which API provided this price
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Note: We don't need triggers for NOTIFY as we'll handle this in application code
-- PostgreSQL's built-in NOTIFY/LISTEN functionality will be used directly