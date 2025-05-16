import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {logger} from 'hono/logger';
import {createDbContext} from '../lib/db';

// Initialize the database context
const db = createDbContext();

// Create the Hono app
const server = new Hono();

server.use('*', cors());
server.use('*', logger());

server.get('/api/events', async (c) => {
    try {
        // Extract query parameters
        const cursor = c.req.query('cursor');
        const limitParam = c.req.query('limit');
        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10;
        const type = c.req.query('type');

        const result = await db.auctionEvents.getEvents({
            cursor,
            limit,
            type,
        });

        return c.json(result);
    } catch (error) {
        console.error('Error fetching events:', error);
        return c.json({error: 'Internal Server Error'}, 500);
    }
});

process.on('SIGINT', async () => {
    console.log('Shutting down API server...');
    try {
        await db.close();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down API server...');
    try {
        await db.close();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});

export default server;