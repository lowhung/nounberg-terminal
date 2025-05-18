import {createWorker, setupQueueEvents, closeQueueResources} from '@/lib/queue';
import {createDbContext} from '@/lib/db';
import {Worker, QueueEvents} from 'bullmq';
import {processEnrichEventJob} from './processors/event-processor';

const dbContext = createDbContext();

let workerInstance: Worker;
let queueEventsInstance: QueueEvents;

async function onJobComplete(eventId: string) {
    console.log(`Processing completed for event ${eventId}`);
}

async function startWorker() {
    try {
        console.log('Starting event enrichment worker...');

        workerInstance = createWorker(processEnrichEventJob, onJobComplete);

        queueEventsInstance = setupQueueEvents();

        console.log('Worker started successfully');

        setInterval(() => {
            console.log(`Worker status: ${workerInstance.isRunning() ? 'Running' : 'Not running'}`);
        }, 60000);
        const shutdown = async () => {
            console.log('Shutting down worker...');

            await closeQueueResources();

            await dbContext.close();

            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (error) {
        console.error('Error starting worker:', error);
        process.exit(1);
    }
}

startWorker().catch(error => {
    console.error('Fatal error in worker:', error);
    process.exit(1);
});