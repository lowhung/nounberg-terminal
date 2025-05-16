import axios from 'axios';
import {createPublicClient, http} from 'viem';
import {mainnet} from 'viem/chains';
import {CacheService} from '@/lib/cache';
import {completeJob, failJob, getNextJob} from '@/lib/queue';
import {processEnrichEventJob} from './processors/event-processor';
import {createDbClient, createDbPool} from '@/lib/db';
import os from 'os';

const WORKER_NAME = process.env.WORKER_NAME || `worker-${os.hostname()}-${process.pid}`;
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || process.env.PONDER_RPC_URL_1;
const WORKER_POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '1000', 10);

const pgPool = createDbPool();
const pgClient = createDbClient();

const provider = createPublicClient({
    chain: mainnet,
    transport: http(ETHEREUM_RPC_URL || ''),
});

const cacheService = new CacheService(pgPool);

async function processNextJob(): Promise<void> {
    let client;
    try {
        client = await pgPool.connect();  // Get a connection from the pool

        const job = await getNextJob(client);
        if (!job) {
            return;
        }

        let success = false;
        if (job.type === 'enrich_event') {
            // Pass the pooled client, not the notification client
            success = await processEnrichEventJob(client, job, cacheService, provider, axios);
        }

        if (success) {
            await completeJob(client, job.id);
        } else {
            await failJob(client, job.id, 'Job processing failed');
        }
    } catch (error) {
        console.error(`[${WORKER_NAME}] Error processing job:`, error);
    } finally {
        if (client) {
            client.release();  // Release back to the pool
        }
    }
}

async function startWorker(): Promise<void> {
    try {
        await pgClient.connect();
        await pgClient.query('LISTEN new_job');

        pgClient.on('notification', async (notification) => {
            console.log(`[${WORKER_NAME}] Received notification on channel ${notification.channel}: ${notification.payload}`);
            if (notification.channel === 'new_job') {
                await processNextJob();
            }
        });

        console.log(`[${WORKER_NAME}] Worker started, listening for notifications...`);
        // TODO: 1) Increase the polling interval when there are no jobs, decrease it when jobs are available
        // TODO: 2) Process multiple jobs per poll to improve efficiency
        // TODO: 3) Implement exponential backoff in polling frequency during extended idle periods
        setInterval(processNextJob, WORKER_POLL_INTERVAL);
        await processNextJob();
    } catch (error) {
        console.error(`[${WORKER_NAME}] Error starting worker:`, error);
        process.exit(1);
    }
}


process.on('SIGINT', async () => {
    console.log(`[${WORKER_NAME}] Shutting down worker...`);
    await pgClient.end();
    await pgPool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(`[${WORKER_NAME}] Shutting down worker...`);
    await pgClient.end();
    await pgPool.end();
    process.exit(0);
});


startWorker().catch((error) => {
    console.error(`[${WORKER_NAME}] Fatal error starting worker:`, error);
    process.exit(1);
});