import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {logger} from 'hono/logger';
import {createDbContext, createDbPool} from '@/lib/db';
import {graphql} from "ponder";
import schema from "ponder:schema";
import {db} from "ponder:api";
import docsRouter from '@/docs/router';

const dbContext = createDbContext();
const pgPool = createDbPool();

const server = new Hono();

server.use('*', logger());
server.use("/graphql", graphql({db, schema}));

server.get('/api/events', async (c) => {
    try {
        const cursor = c.req.query('cursor');
        const limitParam = c.req.query('limit');
        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10;
        const type = c.req.query('type');

        const result = await dbContext.auctionEvents.getEvents({
            cursor,
            limit,
            type,
        });

        return c.json(result);
    } catch (error) {
        console.error('Error fetching events:', error);
        return c.json({error: {code: 'INTERNAL_ERROR', message: 'Internal Server Error'}}, 500);
    }
});

server.get('/api/events/:id', async (c) => {
    try {
        const id = c.req.param('id');
        if (!id) {
            return c.json({error: {code: 'MISSING_PARAM', message: 'Event ID is required'}}, 400);
        }

        const event = await dbContext.auctionEvents.getEventById(id);
        if (!event) {
            return c.json({error: {code: 'NOT_FOUND', message: 'Event not found'}}, 404);
        }

        return c.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        return c.json({error: {code: 'INTERNAL_ERROR', message: 'Internal Server Error'}}, 500);
    }
});

server.get('/api/health', async (c) => {
    try {
        const startTime = process.env.SERVER_START_TIME ? parseInt(process.env.SERVER_START_TIME, 10) : Date.now();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        
        return c.json({
            status: 'ok',
            version: process.env.APP_VERSION || '1.0.0',
            uptime
        });
    } catch (error) {
        console.error('Health check failed:', error);
        return c.json({
            status: 'error',
            message: 'Health check failed'
        }, 500);
    }
});

server.route('/docs', docsRouter);

server.get('/', (c) => {
    return c.redirect('/docs');
});

process.on('SIGINT', async () => {
    console.log('Shutting down API server...');
    try {
        await dbContext.close();
        await pgPool.end();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down API server...');
    try {
        await dbContext.close();
        await pgPool.end();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});

export default server;