import {Worker} from 'bullmq';
import {QUEUE_NAMES} from './constants';
import {createRedisConnection} from './index';
import {logger} from './logger';
import path from 'path';
import {pathToFileURL} from 'url';
import {closeCacheService} from "./cache";
import {createDbContext} from "./db/context";

let workerInstance: Worker | null = null;

async function startWorker() {
    try {
        logger.info('Starting event enrichment worker...');

        const dbContext = createDbContext();
        logger.info('Initialized database context');

        const redisConnection = createRedisConnection();
        logger.info('Created Redis connection for worker');

        let processorPath = './processors/event-enricher.js';
        const resolvedProcessorPath = path.resolve(__dirname, processorPath);
        const processorUrl = pathToFileURL(resolvedProcessorPath);

        workerInstance = new Worker(
            QUEUE_NAMES.EVENT_ENRICHMENT,
            processorUrl,
            {
                connection: redisConnection,
                concurrency: 5,
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
            logger.info('Database connections closed');

            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        process.on('warning', (warning) => {
            logger.warn(`Process warning: ${warning.message}`);
        });

    } catch (error: any) {
        logger.error(`Error starting worker: ${error.message}`);
        process.exit(1);
    }
}

startWorker().catch(error => {
    logger.error(`Fatal error in worker: ${error.message}`);
    process.exit(1);
});
