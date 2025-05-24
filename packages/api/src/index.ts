import {serve} from '@hono/node-server';
import {Hono} from 'hono';
import {cors} from 'hono/cors';
import docsRouter from './docs/router';
import {broadcastMessage, getConnectionStats, setupWebSockets, startNotificationListener} from './websocket';
import {
    transformCursorPaginatedResponse,
    transformHealthResponse,
    transformPaginatedResponse
} from './models/transformers';
import {createDbContext} from "./db";
import {CursorPaginationSchema, OffsetPaginationSchema} from "./models/auction-event.schema";
import {logger} from "./logger";

const PORT = parseInt(process.env.PORT || '3000', 10);

const dbContext = createDbContext();

const app = new Hono();


// Enable CORS for frontend
app.use('*', cors({
    origin: ['http://localhost:8080', 'http://localhost:3000'],
    credentials: true,
}));

app.route('/docs', docsRouter);
app.get('/', (c) => {
    return c.redirect('/docs');
});

// Enhanced events endpoint with cursor pagination
app.get('/api/events', async (c) => {
    try {
        const rawParams = c.req.query();
        
        const hasCursor = 'cursor' in rawParams;
        const hasOffset = 'offset' in rawParams;

        if (hasCursor || (!hasOffset && !('offset' in rawParams))) {
            const validatedParams = CursorPaginationSchema.safeParse(rawParams);
            
            if (!validatedParams.success) {
                return c.json({
                    error: {
                        code: 'INVALID_PARAMS',
                        message: 'Invalid pagination parameters',
                        details: validatedParams.error.errors
                    }
                }, 400);
            }

            const { limit, cursor, type, nounId, direction } = validatedParams.data;

            const result = await dbContext.auctionEvents.getEventsCursor({
                limit,
                cursor,
                type,
                nounId,
                direction
            });
            logger.info(`Cursor pagination: fetched ${result.data.length} events, hasMore: ${result.pagination.hasMore}`);

            const transformedResponse = transformCursorPaginatedResponse(result);
            return c.json(transformedResponse);

        } else {
            const validatedParams = OffsetPaginationSchema.safeParse(rawParams);
            
            if (!validatedParams.success) {
                return c.json({
                    error: {
                        code: 'INVALID_PARAMS', 
                        message: 'Invalid pagination parameters',
                        details: validatedParams.error.errors
                    }
                }, 400);
            }

            const { offset, limit, type, nounId } = validatedParams.data;

            const result = await dbContext.auctionEvents.getEvents({
                offset,
                limit,
                type,
                nounId
            });

            logger.info(`Offset pagination: fetched ${result.count} events with offset ${offset} and limit ${limit}`);

            const transformedResponse = transformPaginatedResponse({
                data: result.events,
                count: result.count,
                offset: result.offset
            });

            return c.json(transformedResponse);
        }

    } catch (error) {
        logger.error(`Error fetching events: ${error}`);
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

        const testStart = Date.now();
        const testQuery = await dbContext.auctionEvents.getEventsCursor({ limit: 1 });
        const queryTime = Date.now() - testStart;

        const wsStats = getConnectionStats();

        const dbHealthy = await dbContext.auctionEvents.healthCheck();

        const healthResponse = transformHealthResponse({
            status: dbHealthy ? 'ok' : 'degraded',
            version: process.env.APP_VERSION || '1.0.0',
            uptime,
            database: {
                status: dbHealthy ? 'connected' : 'disconnected',
                queryTime: `${queryTime}ms`,
                totalEvents: testQuery.pagination.totalCount || 0
            },
            websocket: {
                connections: wsStats.active,
                total: wsStats.total
            },
            pagination: {
                method: 'cursor-based',
                performance: queryTime < 100 ? 'optimal' : queryTime < 500 ? 'good' : 'degraded'
            }
        });

        return c.json(healthResponse);
    } catch (error) {
        logger.error('Health check failed:', error);
        return c.json({
            status: 'error',
            message: 'Health check failed',
            database: 'disconnected'
        }, 500);
    }
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
                type: 'system',
                message: 'Nounberg Terminal is online',
                timestamp: new Date().toISOString()
            });
        }, 2000);

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
