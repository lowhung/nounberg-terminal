import {serve} from '@hono/node-server';
import {Hono} from 'hono';
import {PaginatedEventsSchema, SingleEventResponseSchema} from './models/auction-event.schema';
import docsRouter from './docs/router';
import {setupWebSockets, startNotificationListener, broadcastMessage} from './websocket';
import {zodTransform} from './utils';
import logger from "./shared/logger";
import {createDbContext} from "./db";

const PORT = parseInt(process.env.PORT || '3000', 10);

const dbContext = createDbContext();

const app = new Hono();

app.get('/api/events', async (c) => {
    try {
        const offset = c.req.query('offset');
        const limitParam = c.req.query('limit');
        const type = c.req.query('type');
        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10;

        const result = await dbContext.auctionEvents.getEvents({
            offset: offset ? parseInt(offset, 10) : 0,
            limit: limit,
            type: type || undefined
        });

        const transformedEvents = zodTransform(PaginatedEventsSchema)({
            data: result.events,
            count: result.count,
            offset: result.offset
        });

        return c.json(transformedEvents);
    } catch (error) {
        logger.error('Error fetching events:', error);
        return c.json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal Server Error'
            }
        }, 500);
    }
});

app.get('/api/events/:id', async (c) => {
    try {
        const id = c.req.param('id');
        if (!id) {
            return c.json({
                error: {
                    code: 'MISSING_PARAM',
                    message: 'Event ID is required'
                }
            }, 400);
        }

        const event = await dbContext.auctionEvents.getEventById(id);
        if (!event) {
            return c.json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Event not found'
                }
            }, 404);
        }

        const transformedEvent = zodTransform(SingleEventResponseSchema)(event);
        return c.json(transformedEvent);
    } catch (error) {
        logger.error('Error fetching event:', error);
        return c.json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal Server Error'
            }
        }, 500);
    }
});

app.get('/api/health', async (c) => {
    try {
        const startTime = process.env.SERVER_START_TIME ? parseInt(process.env.SERVER_START_TIME, 10) : Date.now();
        const uptime = Math.floor((Date.now() - startTime) / 1000);

        const testQuery = await dbContext.auctionEvents.getEvents({limit: 1});

        return c.json({
            status: 'ok',
            version: process.env.APP_VERSION || '1.0.0',
            uptime,
            database: 'connected'
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        return c.json({
            status: 'error',
            message: 'Health check failed',
            database: 'disconnected'
        }, 500);
    }
});

app.route('/docs', docsRouter);

app.get('/', (c) => {
    return c.redirect('/docs');
});

async function start() {
    try {
        const {injectWebSocket} = setupWebSockets(app);

        logger.info(`Starting server on port ${PORT}...`);

        const server = serve({
            fetch: app.fetch,
            port: PORT
        });

        injectWebSocket(server);

        const notificationClient = await startNotificationListener(dbContext);

        logger.info(`Server started successfully on port ${PORT}`);

        setTimeout(() => {
            broadcastMessage({
                type: 'test',
                message: 'This is a test message from the server',
                timestamp: new Date().toISOString()
            });
        }, 5000);

        const shutdown = async () => {
            logger.info('Shutting down server...');
            try {
                await notificationClient.end();
                await dbContext.close();
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        return {server, dbContext, notificationClient};
    } catch (error) {
        logger.error('Failed to start server:', error);
        throw error;
    }
}

start().catch(error => {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
});
