import axios from 'axios';
import {createPublicClient, http} from 'viem';
import {mainnet} from 'viem/chains';
import {CacheService} from '../lib/cache';
import {completeJob, failJob, getNextJob} from '../lib/queue';
import {processEnrichEventJob} from './processors/event-processor';
import {createDbClient, createDbPool} from '../lib/db';

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || process.env.PONDER_RPC_URL_1;
const WORKER_POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '1000', 10);

const pgPool = createDbPool();
const pgClient = createDbClient();

const provider = createPublicClient({
    chain: mainnet,
    transport: http(ETHEREUM_RPC_URL || ''),
});

const cacheService = new CacheService(pgPool);

/**
 * Process the next job in the queue
 */
async function processNextJob(): Promise<void> {
    let client;
    try {
        client = await pgPool.connect();

        const job = await getNextJob(client);
        if (!job) {
            return;
        }
        console.log(`Processing job ${job.id} (${job.type}) for event ${job.event_id}`);

        let success = false;

        if (job.type === 'enrich_event') {
            success = await processEnrichEventJob(pgClient, job, cacheService, provider, axios);
        } else {
            console.warn(`Unknown job type: ${job.type}`);
        }

        if (success) {
            await completeJob(client, job.id);
        } else {
            await failJob(client, job.id, 'Job processing failed');
        }
    } catch (error) {
        console.error('Error processing job:', error);
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function startWorker(): Promise<void> {
    try {
        await pgClient.connect();
        await pgClient.query('LISTEN new_job');

        pgClient.on('notification', async (notification) => {
            console.log(`Received notification on channel ${notification.channel}: ${notification.payload}`);
            if (notification.channel === 'new_job') {
                await processNextJob();
            }
        });

        console.log('Worker started, listening for notifications...');
        setInterval(processNextJob, WORKER_POLL_INTERVAL);
        await processNextJob();

        // Clean up expired cache entries daily
        setInterval(() => cacheService.cleanupExpiredEntries(), 24 * 60 * 60 * 1000);
    } catch (error) {
        console.error('Error starting worker:', error);
        process.exit(1);
    }
}


process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await pgClient.end();
    await pgPool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    await pgClient.end();
    await pgPool.end();
    process.exit(0);
});


startWorker().catch((error) => {
    console.error('Fatal error starting worker:', error);
    process.exit(1);
});