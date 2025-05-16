import { Pool, PoolClient } from 'pg';

export interface Job {
  id: number;
  event_id: string;
  type: string;
  attempts: number;
  data: any;
}

function serializeData(data: Record<string, any>): string {
  return JSON.stringify(data, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

export async function createJob(
  client: Pool | PoolClient, 
  eventId: string, 
  type: string, 
  data: Record<string, any> = {}
): Promise<number | null> {
  try {
    const existingJob = await client.query(
      `SELECT id FROM auction_jobs 
       WHERE event_id = $1 AND type = $2 AND status IN ('pending', 'processing')`,
      [eventId, type]
    );

    if (existingJob.rowCount !== null && existingJob.rowCount > 0) {
      console.log(`Job already exists for event ${eventId}`);
      return existingJob.rows[0].id;
    }

    const result = await client.query(
      `INSERT INTO auction_jobs (event_id, type, status, data, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, NOW(), NOW())
       RETURNING id`,
      [eventId, type, serializeData(data)]
    );

    const jobId = result.rows[0].id;
    
    await client.query(`NOTIFY new_job, '${jobId}'`);

    console.log(`Created job ${jobId} for event ${eventId}`);
    return jobId;
  } catch (error) {
    console.error('Error creating job:', error);
    return null;
  }
}

/**
 * Get the next pending job from the queue
 * @param client - Database client
 * @returns The next job to process, or null if none
 */
export async function getNextJob(client: Pool | PoolClient): Promise<Job | null> {
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE auction_jobs
       SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
       WHERE id = (
         SELECT id FROM auction_jobs
         WHERE status = 'pending'
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING id, event_id, type, attempts, data`
    );

    if (result.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const job = result.rows[0];
    job.data = job.data || {};

    await client.query('COMMIT');
    return job;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error getting next job:', error);
    throw error;
  }
}

/**
 * Mark a job as completed
 * @param client - Database client
 * @param jobId - ID of the job to complete
 */
export async function completeJob(client: Pool | PoolClient, jobId: number): Promise<void> {
  try {
    await client.query(
      `UPDATE auction_jobs
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1`,
      [jobId]
    );
    console.log(`Completed job ${jobId}`);
  } catch (error) {
    console.error(`Error completing job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Mark a job as failed
 * @param client - Database client
 * @param jobId - ID of the job that failed
 * @param error - Error message
 */
export async function failJob(client: Pool | PoolClient, jobId: number, error: Error | string): Promise<void> {
  try {
    await client.query(
      `UPDATE auction_jobs
       SET status = 'failed', error = $2, updated_at = NOW()
       WHERE id = $1`,
      [jobId, error.toString()]
    );
    console.log(`Failed job ${jobId}: ${error.toString()}`);
  } catch (err) {
    console.error(`Error failing job ${jobId}:`, err);
    throw err;
  }
}

/**
 * Retry a failed job
 * @param client - Database client
 * @param jobId - ID of the job to retry
 */
export async function retryJob(client: Pool | PoolClient, jobId: number): Promise<void> {
  try {
    await client.query(
      `UPDATE auction_jobs
       SET status = 'pending', error = NULL, updated_at = NOW()
       WHERE id = $1`,
      [jobId]
    );
    
    await client.query(`NOTIFY new_job, '${jobId}'`);
    
    console.log(`Retrying job ${jobId}`);
  } catch (error) {
    console.error(`Error retrying job ${jobId}:`, error);
    throw error;
  }
}