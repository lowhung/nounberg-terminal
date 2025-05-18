import {Queue, Worker, Job, QueueEvents} from 'bullmq';
import Redis from 'ioredis';
import {getCacheService} from './cache';
import {createPublicClient, http} from 'viem';
import {mainnet} from 'viem/chains';
import axios from 'axios';
import {EventData} from '@/types';

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
        console.log('Created new Redis connection for queue operations');
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
                },
            }
        });
        console.log('Created event enrichment queue');

        const cleanupQueue = async () => {
            if (eventEnrichmentQueue) {
                console.log('Closing event enrichment queue');
                await eventEnrichmentQueue.close();
                eventEnrichmentQueue = null;
            }
            if (redisConnection) {
                console.log('Closing Redis connection for queue');
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
        const job = await queue.add(`enrich-event-${eventData.id}`, eventData, {});
        console.log(`Added job ${job.id} to enrich event ${eventData.id}`);
        return job;
    } catch (error) {
        if (error.name === 'BullMQDuplicateJob') {
            console.log(`Job for event ${eventData.id} already exists, skipping`);
            return null;
        }
        console.error(`Error adding job for event ${eventData.id}:`, error);
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
            console.log(`Processing job ${job.id} for event enrichment`);

            try {
                const result = await processCallback(job);

                if (onJobComplete) {
                    onJobComplete(job.data.id);
                }

                return result;
            } catch (error) {
                console.error(`Error processing job ${job.id}:`, error);
                throw error;
            }
        },
        {
            connection: getRedisConnection(),
        }
    );

    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
        console.error(`Job ${job?.id} failed with error:`, error);
    });

    worker.on('error', (error) => {
        console.error('Worker error:', error);
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

let queueEvents: QueueEvents | null = null;

export function setupQueueEvents(onJobCompleted?: (jobId: string, returnValue: any) => void): QueueEvents {
    if (queueEvents) {
        return queueEvents;
    }

    queueEvents = new QueueEvents(QUEUE_NAMES.EVENT_ENRICHMENT, {
        connection: getRedisConnection(),
    });

    queueEvents.on('completed', ({jobId, returnvalue}) => {
        console.log(`Job ${jobId} completed with result:`, returnvalue);
        if (onJobCompleted) {
            onJobCompleted(jobId, returnvalue);
        }
    });

    queueEvents.on('failed', ({jobId, failedReason}) => {
        console.error(`Job ${jobId} failed with reason:`, failedReason);
    });

    const shutdown = async () => {
        if (queueEvents) {
            console.log('Shutting down queue events listener...');
            await queueEvents.close();
            queueEvents = null;
        }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return queueEvents;
}

export async function closeQueueResources() {
    if (queueEvents) {
        await queueEvents.close();
        queueEvents = null;
    }

    if (eventEnrichmentQueue) {
        await eventEnrichmentQueue.close();
        eventEnrichmentQueue = null;
    }

    if (redisConnection) {
        redisConnection.disconnect();
        redisConnection = null;
    }
}