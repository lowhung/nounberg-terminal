import {Queue} from 'bullmq';
import Redis from 'ioredis';
import {QUEUE_NAMES} from "./constants";
import {EventData} from "./types";
import {logger} from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export function createRedisConnection() {
    return new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        db: 0, // Use database 0 for queue operations
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
    } catch (error: any) {
        logger.error(`Error adding job for event ${eventData.id}:`, error);
        throw error;
    }
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