import {Worker} from 'bullmq';
import Redis from 'ioredis';
import {QUEUE_NAMES} from './constants';
import {logger} from './logger';
import path from 'path';
import {pathToFileURL} from 'url';
import {closeCacheService} from "./cache";
import {createDbContext} from "./db/context";

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function createWorkerRedisConnection() {
    const redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        db: 0,
    });

    // Set max listeners to prevent EventEmitter warnings (due to high worker concurrency)
    redis.setMaxListeners(20);
    return redis;
}

let workerRedisConnection: Redis | null = null;
let workerInstance: Worker | null = null;

function getWorkerRedisConnection(): Redis {
    if (!workerRedisConnection) {
        workerRedisConnection = createWorkerRedisConnection();
        logger.info('Created Redis connection for worker');
    }
    return workerRedisConnection;
}

async function startWorker() {
    try {
        logger.info('Starting event enrichment worker...');

        const dbContext = createDbContext();
        logger.info('Initialized database context');

        const redisConnection = getWorkerRedisConnection();
        logger.info('Retrieved Redis connection for worker');

        let processorPath = './processors/event-enricher.js';
        const resolvedProcessorPath = path.resolve(__dirname, processorPath);
        const processorUrl = pathToFileURL(resolvedProcessorPath);

        workerInstance = new Worker(
            QUEUE_NAMES.EVENT_ENRICHMENT,
            processorUrl,
            {
                concurrency: 10,
                connection: redisConnection,
            }
        );

        workerInstance.on('completed', (job) => {
            logger.debug(`Job ${job.id} completed successfully`);
        });

        workerInstance.on('failed', (job, error) => {
            logger.error(`Job ${job?.id} failed with error: ${error.message}`);
        });

        workerInstance.on('error', (error) => {
            logger.error(`Worker error: ${error.message}`);
        });

        workerInstance.on('ready', () => {
            logger.info('Worker is ready and waiting for jobs');
        });

        workerInstance.on('stalled', (jobId) => {
            logger.warn(`Job ${jobId} stalled`);
        });

        logger.info('Event enrichment worker started successfully');

        const shutdown = async () => {
            logger.info('Shutting down worker...');

            if (workerInstance) {
                await workerInstance.close();
                logger.info('Worker closed');
            }

            await dbContext.close();
            await closeCacheService();
            await closeWorkerResources();
            logger.info('Database and Redis connections closed');

            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        process.on('warning', (warning) => {
            logger.warn(`Process warning: ${warning.message}`);
            if (warning.name === 'MaxListenersExceededWarning') {
                logger.warn({msg: 'MaxListenersExceededWarning detected', warning});
            }
        });

    } catch (error: any) {
        logger.error(`Error starting worker: ${error.message}`);
        process.exit(1);
    }
}

async function closeWorkerResources() {
    if (workerRedisConnection) {
        workerRedisConnection.disconnect();
        workerRedisConnection = null;
        logger.info('Closed worker Redis connection');
    }
}

startWorker().catch(error => {
    logger.error(`Fatal error in worker: ${error.message}`);
    process.exit(1);
});