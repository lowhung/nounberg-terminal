import {Job, Queue, Worker} from 'bullmq';
import Redis from 'ioredis';
import {getCacheService} from './cache';
import {createPublicClient, http} from 'viem';
import {mainnet} from 'viem/chains';
import axios from 'axios';
import {EventData} from '@/types';
import logger from "@/lib/logger";

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || process.env.PONDER_RPC_URL_1;

export const QUEUE_NAMES = {
    EVENT_ENRICHMENT: 'event-enrichment',
};

export function createRedisConnection() {
    return new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
    });
}

let redisConnection: Redis | null = null;

function getRedisConnection(): Redis {
    if (!redisConnection) {
        redisConnection = createRedisConnection();
        logger.info('Created new Redis connection for queue operations');
    }
    return redisConnection;
}

let eventEnrichmentQueue: Queue | null = null;

export function getEventEnrichmentQueue(): Queue {
    if (!eventEnrichmentQueue) {
        eventEnrichmentQueue = new Queue(QUEUE_NAMES.EVENT_ENRICHMENT, {
            connection: getRedisConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            }
        });
        logger.info('Created event enrichment queue');

        const cleanupQueue = async () => {
            if (eventEnrichmentQueue) {
                logger.info('Closing event enrichment queue');
                await eventEnrichmentQueue.close();
                eventEnrichmentQueue = null;
            }
            if (redisConnection) {
                logger.info('Closing Redis connection for queue');
                redisConnection.disconnect();
                redisConnection = null;
            }
        };

        process.on('SIGINT', cleanupQueue);
        process.on('SIGTERM', cleanupQueue);
    }
    return eventEnrichmentQueue;
}

export async function addEventEnrichmentJob(eventData: EventData) {
    const queue = getEventEnrichmentQueue();
    try {
        const job = await queue.add(QUEUE_NAMES.EVENT_ENRICHMENT, eventData, {
            jobId: eventData.id,
        });
        logger.debug(`Added job ${job.id} to enrich event ${eventData.id}`);
        return job;
    } catch (error) {
        if (error.name === 'BullMQDuplicateJob') {
            logger.warn(`Job for event ${eventData.id} already exists, skipping`);
            return null;
        }
        logger.error(`Error adding job for event ${eventData.id}:`, error);
        throw error;
    }
}

export function createWorker(
    processCallback: (job: Job) => Promise<any>,
    onJobComplete?: (jobId: string) => void
): Worker {
    const worker = new Worker(
        QUEUE_NAMES.EVENT_ENRICHMENT,
        async (job: Job) => {
            logger.debug(`Processing job ${job.id} for event enrichment`);

            try {
                const result = await processCallback(job);

                if (onJobComplete) {
                    logger.debug(`Processing completed for event ${job.data.id}`);
                }

                return result;
            } catch (error) {
                logger.error(`Error processing job ${job.id}:`, error);
                throw error;
            }
        },
        {
            connection: getRedisConnection(),
        }
    );

    worker.on('completed', (job) => {
        logger.debug(`Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
        logger.error(`Job ${job?.id} failed with error:`, error);
    });

    worker.on('error', (error) => {
        logger.error('Worker error:', error);
    });

    return worker;
}

export function getJobProcessingDependencies() {
    return {
        cacheService: getCacheService(),
        provider: createPublicClient({
            chain: mainnet,
            transport: http(ETHEREUM_RPC_URL || ''),
        }),
        axios
    };
}


export async function closeQueueResources() {
    if (eventEnrichmentQueue) {
        await eventEnrichmentQueue.close();
        eventEnrichmentQueue = null;
    }

    if (redisConnection) {
        redisConnection.disconnect();
        redisConnection = null;
    }
}