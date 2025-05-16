import {Pool, PoolClient} from 'pg';
import {Job} from "@/types/index";



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
        const completedJob = await client.query(
            `SELECT id
             FROM auction_jobs
             WHERE event_id = $1
               AND type = $2
               AND status = 'completed'`,
            [eventId, type]
        );

        if (completedJob.rowCount && completedJob.rowCount > 0) {
            console.log(`Job for event ${eventId} already completed, not recreating`);
            return completedJob.rows[0].id;
        }

        const existingJob = await client.query(
            `SELECT id, status
             FROM auction_jobs
             WHERE event_id = $1
               AND type = $2
               AND status IN ('pending', 'processing')`,
            [eventId, type]
        );

        if (existingJob.rowCount && existingJob.rowCount > 0) {
            console.log(`Job already exists for event ${eventId} with status ${existingJob.rows[0].status}`);
            return existingJob.rows[0].id;
        }

        const failedJob = await client.query(
            `SELECT id
             FROM auction_jobs
             WHERE event_id = $1
               AND type = $2
               AND status = 'failed'`,
            [eventId, type]
        );

        if (failedJob.rowCount && failedJob.rowCount > 0) {
            await client.query(
                `UPDATE auction_jobs
                 SET status = 'pending',
                     attempts = 0,
                     data = $2,
                     error = NULL,
                     updated_at = NOW()
                 WHERE id = $1`,
                [failedJob.rows[0].id, serializeData(data)]
            );

            const jobId = failedJob.rows[0].id;

            await client.query(`NOTIFY new_job, '${jobId}'`);

            console.log(`Retrying previously failed job ${jobId} for event ${eventId}`);
            return jobId;
        }

        const result = await client.query(
            `INSERT INTO auction_jobs (event_id, type, status, data, created_at, updated_at)
             VALUES ($1, $2, 'pending', $3, NOW(), NOW())
             ON CONFLICT (event_id, type, status) DO NOTHING
             RETURNING id`,
            [eventId, type, serializeData(data)]
        );

        if (result.rowCount && result.rowCount > 0) {
            const jobId = result.rows[0].id;

            await client.query(`NOTIFY new_job, '${jobId}'`);

            console.log(`Created job ${jobId} for event ${eventId}`);
            return jobId;
        } else {
            const conflictJob = await client.query(
                `SELECT id
                 FROM auction_jobs
                 WHERE event_id = $1
                   AND type = $2
                   AND status = 'pending'`,
                [eventId, type]
            );

            if (conflictJob.rowCount && conflictJob.rowCount > 0) {
                console.log(`Conflict creating job for event ${eventId}, using existing job ${conflictJob.rows[0].id}`);
                return conflictJob.rows[0].id;
            }

            console.warn(`Failed to create job for event ${eventId} but no conflict found`);
            return null;
        }
    } catch (error) {
        console.error('Error creating job:', error);
        return null;
    }
}

export async function getNextJob(client: Pool | PoolClient): Promise<Job | null> {
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE auction_jobs
             SET status     = 'processing',
                 attempts   = attempts + 1,
                 updated_at = NOW()
             WHERE id = (SELECT id
                         FROM auction_jobs
                         WHERE status = 'pending'
                         ORDER BY created_at
                             FOR UPDATE SKIP LOCKED
                         LIMIT 1)
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

export async function completeJob(client: Pool | PoolClient, jobId: number): Promise<void> {
    try {
        const jobCheck = await client.query(
            `SELECT status
             FROM auction_jobs
             WHERE id = $1`,
            [jobId]
        );

        if (jobCheck.rowCount === 0) {
            console.log(`Job ${jobId} not found, cannot complete`);
            return;
        }

        if (jobCheck.rows[0].status === 'completed') {
            console.log(`Job ${jobId} is already completed`);
            return;
        }

        await client.query(
            `UPDATE auction_jobs
             SET status = 'completed',
                 updated_at = NOW()
             WHERE id = $1
               AND status != 'completed'`,
            [jobId]
        );

        console.log(`Completed job ${jobId}`);
    } catch (error) {
        if (error.code === '23505') {
            console.warn(`Job ${jobId} completion constraint violation, may already be completed`);
        } else {
            console.error(`Error completing job ${jobId}:`, error);
            throw error;
        }
    }
}

export async function failJob(client: Pool | PoolClient, jobId: number, error: Error | string): Promise<void> {
    try {
        const jobCheck = await client.query(
            `SELECT status
             FROM auction_jobs
             WHERE id = $1`,
            [jobId]
        );

        if (jobCheck.rowCount === 0) {
            console.log(`Job ${jobId} not found, cannot mark as failed`);
            return;
        }

        if (['completed', 'failed'].includes(jobCheck.rows[0].status)) {
            console.log(`Job ${jobId} is already in final state: ${jobCheck.rows[0].status}`);
            return;
        }

        await client.query(
            `UPDATE auction_jobs
             SET status = 'failed',
                 error = $2,
                 updated_at = NOW()
             WHERE id = $1
               AND status NOT IN ('completed', 'failed')`,
            [jobId, error.toString()]
        );
        console.log(`Failed job ${jobId}: ${error.toString()}`);
    } catch (err) {
        if (err.code === '23505') {
            console.warn(`Job ${jobId} failure constraint violation, may already be in final state`);
        } else {
            console.error(`Error failing job ${jobId}:`, err);
            throw err;
        }
    }
}

export async function retryJob(client: Pool | PoolClient, jobId: number): Promise<void> {
    try {
        const jobCheck = await client.query(
            `SELECT status
             FROM auction_jobs
             WHERE id = $1`,
            [jobId]
        );

        if (jobCheck.rowCount === 0) {
            console.log(`Job ${jobId} not found, cannot retry`);
            return;
        }

        if (['pending', 'processing'].includes(jobCheck.rows[0].status)) {
            console.log(`Job ${jobId} is already in progress with status: ${jobCheck.rows[0].status}`);
            return;
        }

        if (jobCheck.rows[0].status === 'completed') {
            console.log(`Job ${jobId} is already completed, not retrying`);
            return;
        }

        await client.query(
            `UPDATE auction_jobs
             SET status = 'pending',
                 error = NULL,
                 updated_at = NOW(),
                 attempts = 0
             WHERE id = $1
               AND status = 'failed'`,
            [jobId]
        );

        await client.query(`NOTIFY new_job, '${jobId}'`);

        console.log(`Retrying job ${jobId}`);
    } catch (error) {
        if (error.code === '23505') {
            console.warn(`Job ${jobId} retry constraint violation, may already be in progress`);
        } else {
            console.error(`Error retrying job ${jobId}:`, error);
            throw error;
        }
    }
}