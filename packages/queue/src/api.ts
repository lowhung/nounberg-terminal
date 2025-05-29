import {serve} from '@hono/node-server';
import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {addEventEnrichmentJob, closeQueueProducerResources, getEventEnrichmentQueue} from './index';
import {EventData} from './types';
import {logger} from './logger';

const app = new Hono();

app.use('*', cors());

app.get('/health', async (c) => {
    try {
        const queue = getEventEnrichmentQueue();
        await queue.getWaiting();

        return c.json({
            status: 'ok',
            queue: 'accessible',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        logger.error({msg: 'Health check failed', error});
        return c.json({
            status: 'error',
            service: 'queue-api',
            timestamp: new Date().toISOString()
        }, 503);
    }
});

app.get('/metrics', async (c) => {
    try {
        const queue = getEventEnrichmentQueue();
        const metrics = await queue.exportPrometheusMetrics();

        return c.text(metrics, 200, {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
        });
    } catch (error: any) {
        logger.error({msg: 'Failed to export Prometheus metrics', error});
        return c.text(`# Error exporting metrics`, 500);
    }
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
        logger.error({msg: 'Error enqueuing job', error});
        return c.json({error: 'Failed to enqueue job'}, 500);
    }
});

const PORT = parseInt(process.env.PORT || '3001');

async function startApiServer() {
    try {
        logger.info('Starting queue API server...');

        getEventEnrichmentQueue();
        logger.info('Initialized event enrichment queue');

        const server = serve({
            fetch: app.fetch,
            port: PORT,
        });

        logger.info(`Queue API server started on port ${PORT}`);

        const shutdown = async () => {
            logger.info('Shutting down queue API server...');
            await closeQueueProducerResources();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        logger.error({msg: 'Error starting queue API server', error});
        process.exit(1);
    }
}

startApiServer().catch(error => {
    logger.error({msg: 'Fatal error in queue API', error});
    process.exit(1);
});
