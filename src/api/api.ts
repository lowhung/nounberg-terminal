import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {logger} from 'hono/logger';
import {createDbContext} from '@/lib/db';
import {graphql} from "ponder";
import schema from "ponder:schema";
import {db} from "ponder:api";

const dbContext = createDbContext();

const server = new Hono();

server.use('*', cors());
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
        return c.json({error: 'Internal Server Error'}, 500);
    }
});

process.on('SIGINT', async () => {
    console.log('Shutting down API server...');
    try {
        await dbContext.close();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down API server...');
    try {
        await dbContext.close();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});

export default server;