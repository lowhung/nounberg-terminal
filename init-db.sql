-- Initialize database schema for auxiliary tables (tables not managed by Ponder)

-- Create jobs table for the queue
CREATE TABLE auction_jobs
(
    id         SERIAL PRIMARY KEY,
    event_id   TEXT      NOT NULL, -- References auctionEvents.id (managed by Ponder)
    type       TEXT      NOT NULL, -- 'enrich_event'
    status     TEXT      NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    attempts   INTEGER   NOT NULL DEFAULT 0,
    data       JSONB,              -- job-specific data
    error      TEXT,               -- error message if it failed
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Create index for faster job querying
    -- This makes sure we only have one job per event+type+status combination
    -- which is particularly important for pending jobs to avoid duplicates
    CONSTRAINT unique_event_type_status UNIQUE (event_id, type, status)
);

CREATE INDEX idx_jobs_status ON auction_jobs (status, updated_at);
