import {EventsQuerySchema} from "@/models/auction-event.schema";
import {serve} from '@hono/node-server';
import {cors} from 'hono/cors';
import {broadcastMessage, setupWebSockets, startNotificationListener} from '@/websocket';
import {logger} from '@/logger';
import {getEvents} from '@/db/auction-event';
import {db} from '@/db';
import {auctionEvents} from '@/db/schema';
import {transformCursorPaginatedResponse} from '@/models/transformers';
import {Hono} from "hono";
import {handleAuthStatus, handleLogout, handleNonce, handleVerify} from "@/auth";

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = new Hono();

app.use('*', cors({
    origin: ['http://localhost:8080', 'http://localhost:3000'],
    credentials: true,
}));

app.get('/', (c) => {
    return c.redirect('/docs');
});

app.get('/auth/nonce', handleNonce);
app.post('/auth/verify', handleVerify);
app.get('/auth/status', handleAuthStatus);
app.post('/auth/logout', handleLogout);

app.get('/api/events', async (c) => {
    try {
        const rawParams = c.req.query();
        const validatedParams = EventsQuerySchema.safeParse(rawParams);

        if (!validatedParams.success) {
            return c.json({
                error: {
                    code: 'INVALID_PARAMS',
                    message: 'Invalid query parameters',
                    details: validatedParams.error.errors
                }
            }, 400);
        }

        const {limit, cursor, type, nounId} = validatedParams.data;

        const result = await getEvents({
            limit,
            cursor,
            type,
            nounId
        });

        const transformedResponse = transformCursorPaginatedResponse(result);
        return c.json(transformedResponse);

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
        const testQuery = await getEvents({limit: 1});
        const queryTime = Date.now() - testStart;

        let dbHealthy = false;
        try {
            await db.select().from(auctionEvents).limit(1);
            dbHealthy = true;
        } catch (error) {
            logger.error({msg: 'Database connection check failed', error});
        }

        return c.json({
            status: dbHealthy ? 'ok' : 'degraded',
            version: process.env.APP_VERSION || '1.0.0',
            uptime,
            database: {
                status: dbHealthy ? 'connected' : 'disconnected',
                queryTime: `${queryTime}ms`,
                recentEvents: testQuery.data.length
            },
            pagination: {
                method: 'cursor-based',
                performance: queryTime < 100 ? 'optimal' : queryTime < 500 ? 'good' : 'degraded'
            }
        });
    } catch (error) {
        logger.error({msg: 'Health check failed', error});
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

        const notificationClient = await startNotificationListener();

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
                process.exit(0);
            } catch (error) {
                logger.error({msg: 'Error during shutdown', error});
                process.exit(1);
            }
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        return {server};
    } catch (error) {
        logger.error({msg: 'Error starting server', error});
        throw error;
    }
}

start().catch(error => {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
});
