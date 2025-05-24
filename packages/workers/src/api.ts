import {serve} from '@hono/node-server';
import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {addEventEnrichmentJob, closeQueueResources} from './queue';
import {EventData} from './types';
import {logger} from './logger';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
    return c.json({status: 'ok', service: 'queue'});
});

app.post('/jobs/enrich-event', async (c) => {
    try {
        const eventData: EventData = await c.req.json();

        if (!eventData.id || !eventData.type) {
            return c.json({error: 'Missing required fields: id, type'}, 400);
        }

        const job = await addEventEnrichmentJob(eventData);

        if (!job) {
            return c.json({message: 'Job already exists', eventId: eventData.id}, 200);
        }

        logger.debug(`Enqueued job ${job.id} for event ${eventData.id}`);
        return c.json({
            success: true,
            jobId: job.id,
            eventId: eventData.id
        }, 201);

    } catch (error) {
        logger.error('Error enqueuing job:', error);
        return c.json({error: 'Failed to enqueue job'}, 500);
    }
});

const PORT = parseInt(process.env.PORT || '3001');

async function startApiServer() {
    try {
        logger.info('Starting workers API server...');

        const server = serve({
            fetch: app.fetch,
            port: PORT,
        });

        logger.info(`Workers API server started on port ${PORT}`);

        const shutdown = async () => {
            logger.info('Shutting down workers API server...');
            await closeQueueResources();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        logger.error('Error starting workers API server:', error);
        process.exit(1);
    }
}

startApiServer().catch(error => {
    logger.error('Fatal error in workers API:', error);
    process.exit(1);
});
