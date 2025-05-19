import {Hono} from 'hono';
import {graphql} from "ponder";
import schema from "ponder:schema";
import {db} from "ponder:api";
import docsRouter from '@/docs/router';
import {eq} from 'drizzle-orm';
import {auctionEvents} from "../../ponder.schema";
import {zodTransform} from "@/lib/serialization";
import {PaginatedEventsSchema} from "@/models/auction-event.schema";
import logger from "@/lib/logger";
import {logger as honoLogger} from "hono/logger";

const server = new Hono();

server.use('*', honoLogger());
server.use("/graphql", graphql({db, schema}));

server.get('/api/events', async (c) => {
    try {
        const offset = c.req.query('offset');
        const limitParam = c.req.query('limit');
        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10;

        const events = await db.query.auctionEvents.findMany({
            limit: limit,
            offset: offset ? parseInt(offset, 10) : 0,
        });

        const transformedEvents = zodTransform(PaginatedEventsSchema)({
            data: events,
            count: events.length,
            offset: offset ? parseInt(offset, 10) : 0
        });

        return c.json(transformedEvents);
    } catch (error) {
        logger.error('Error fetching events:', error);
        return c.json({error: {code: 'INTERNAL_ERROR', message: 'Internal Server Error'}}, 500);
    }
});

server.get('/api/events/:id', async (c) => {
    try {
        const id = c.req.param('id');
        if (!id) {
            return c.json({error: {code: 'MISSING_PARAM', message: 'Event ID is required'}}, 400);
        }

        const event = await db.query.auctionEvents.findFirst({
            where: eq(auctionEvents.id, id),
        });
        if (!event) {
            return c.json({error: {code: 'NOT_FOUND', message: 'Event not found'}}, 404);
        }

        return c.json(event);
    } catch (error) {
        logger.error('Error fetching event:', error);
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
        logger.error('Health check failed:', error);
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

export default server;