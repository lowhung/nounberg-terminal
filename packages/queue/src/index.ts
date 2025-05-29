import {Queue} from 'bullmq';
import Redis from 'ioredis';
import {QUEUE_NAMES} from "./constants";
import {EventData} from "./types";
import {logger} from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function createQueueRedisConnection() {
    const redis = new Redis(REDIS_URL, {
        db: 0,
    });

    // Set max listeners to prevent EventEmitter warnings (due to high worker concurrency)
    redis.setMaxListeners(50);
    return redis;
}

let queueRedisConnection: Redis | null = null;

function getQueueRedisConnection(): Redis {
    if (!queueRedisConnection) {
        queueRedisConnection = createQueueRedisConnection();
        logger.info('Created Redis connection for queue producer');
    }
    return queueRedisConnection;
}

let eventEnrichmentQueue: Queue | null = null;

export function getEventEnrichmentQueue(): Queue {
    if (!eventEnrichmentQueue) {
        eventEnrichmentQueue = new Queue(QUEUE_NAMES.EVENT_ENRICHMENT, {
            connection: getQueueRedisConnection(),
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
        const job = await queue.add(QUEUE_NAMES.EVENT_ENRICHMENT, eventData);
        logger.debug(`Added job ${job.id} to enrich event ${eventData.id}`);
        return job;
    } catch (error: any) {
        logger.error(`Error adding job for event ${eventData.id}:`, error);
        throw error;
    }
}

export async function closeQueueProducerResources() {
    if (eventEnrichmentQueue) {
        await eventEnrichmentQueue.close();
        eventEnrichmentQueue = null;
        logger.info('Closed event enrichment queue');
    }

    if (queueRedisConnection) {
        queueRedisConnection.disconnect();
        queueRedisConnection = null;
        logger.info('Closed queue producer Redis connection');
    }
}
