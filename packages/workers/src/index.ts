import {Worker} from 'bullmq';
import {logger} from './logger';
import { createDbContext } from './db';
import {closeQueueResources, createWorker} from "./queue";
import {processEnrichEventJob} from "./processors/auction-events";

const dbContext = createDbContext();
let workerInstance: Worker;

async function startWorker() {
    try {
        logger.info('Starting event enrichment worker...');

        workerInstance = createWorker(processEnrichEventJob);

        logger.info('Worker started successfully');

        setInterval(() => {
            logger.info(`Worker health check: ${workerInstance.isRunning() ? 'Running' : 'Not running'}`);
        }, 60000);
        
        const shutdown = async () => {
            logger.info('Shutting down worker...');
            await closeQueueResources();
            await dbContext.close();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (error) {
        logger.error('Error starting worker:', error);
        process.exit(1);
    }
}

startWorker().catch(error => {
    logger.error('Fatal error in worker:', error);
    process.exit(1);
});
