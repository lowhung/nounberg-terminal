import {Hono} from 'hono';
import {createNodeWebSocket} from '@hono/node-ws';
import WebSocket from 'ws';
import {transformEvent} from './models/transformers';
import {logger} from './logger';
import {getEventById} from "./db/auction-event";
import {Client} from "pg";

const subscribedClients = new Set<WebSocket>();

type WSMessage =
    | { type: 'subscribe' }
    | { type: 'unsubscribe' }
    | { type: 'ping' }
    | { type: 'pong' };

type WSResponse =
    | { type: 'welcome'; message: string }
    | { type: 'subscribed' }
    | { type: 'unsubscribed' }
    | { type: 'pong'; timestamp: string }
    | { type: 'ping'; timestamp: string }
    | { type: 'event'; data: any }
    | { type: 'system'; message: string; timestamp: string };

function sendMessage(ws: any, message: WSResponse) {
    try {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Failed to send WebSocket message:', error);
        return false;
    }
}

function parseMessage(event: Event): WSMessage | null {
    try {
        let raw: string;
        if (Buffer.isBuffer(event)) {
            raw = event.toString();
        } else if (typeof event === 'string') {
            raw = event;
        } else if (typeof event === 'object' && event !== null) {
            raw = JSON.stringify(event);
        } else {
            logger.warn(`Received unexpected message type: ${event?.type}`);
            return null;
        }

        if (!raw || raw.trim() === '' || raw === '{}') {
            logger.warn('Received empty or invalid message');
            return null;
        }

        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== 'object' || !parsed.type) {
            logger.warn('Message missing required type field:', parsed);
            return null;
        }

        return parsed;
    } catch (error) {
        logger.error(`Failed to parse WebSocket message:`, error);
        return null;
    }
}

function addClient(ws: any) {
    if (ws.raw) {
        subscribedClients.add(ws.raw);
        logger.debug(`Client added. Total connections: ${subscribedClients.size}`);
    }
}

function removeClient(ws: any) {
    if (ws.raw) {
        subscribedClients.delete(ws.raw);
        logger.debug(`Client removed. Total connections: ${subscribedClients.size}`);
    }
}

export function setupWebSockets(app: Hono) {
    const {injectWebSocket, upgradeWebSocket} = createNodeWebSocket({app});

    app.get('/ws', upgradeWebSocket(() => ({
        onOpen(event, ws) {
            logger.info('WebSocket client connected');
            addClient(ws);

            sendMessage(ws, {
                type: 'welcome',
                message: 'Connected to Nounberg Terminal'
            });
        },

        onMessage(event, ws) {
            const message: WSMessage = parseMessage(event);
            if (!message) return;

            logger.debug(`Received WebSocket message: ${JSON.stringify(message)}`);

            switch (message.type) {
                case 'subscribe':
                    addClient(ws);
                    sendMessage(ws, {type: 'subscribed'});
                    logger.debug('Client subscribed to events');
                    break;

                case 'unsubscribe':
                    removeClient(ws);
                    sendMessage(ws, {type: 'unsubscribed'});
                    logger.debug('Client unsubscribed from events');
                    break;

                case 'ping':
                    sendMessage(ws, {
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    });
                    break;

                case 'pong':
                    logger.debug('Received pong from client');
                    break;

                default:
                    logger.warn(`Unknown WebSocket message type: ${message}`);
            }
        },

        onClose(event, ws) {
            logger.info(`WebSocket client disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
            removeClient(ws);
        },

        onError(event, ws) {
            logger.error(`WebSocket error: ${JSON.stringify(event)}`);
            removeClient(ws);
        }
    })));

    logger.info('WebSocket route registered at /ws');
    return {injectWebSocket};
}

export async function startNotificationListener() {
    const pgClient = new Client({
        connectionString: process.env.DATABASE_URL || 'postgres://nounberg:nounberg@localhost:5432/nounberg'
    });

    await pgClient.connect();
    await pgClient.query('LISTEN event_updated');

    pgClient.on('notification', async (notification) => {
        try {
            const eventId = notification.payload;
            if (!eventId) {
                logger.warn('Received notification without event ID');
                return;
            }

            const rawEvent = await getEventById(eventId);
            if (!rawEvent) {
                logger.warn(`Event ${eventId} not found in database`);
                return;
            }

            const transformedEvent = transformEvent(rawEvent);
            broadcastEvent(transformedEvent);

        } catch (error) {
            logger.error('Error handling notification:', error);
        }
    });

    logger.info('PostgreSQL notification listener started');

    const pingInterval = setInterval(() => {
        broadcastMessage({
            type: 'ping',
            timestamp: new Date().toISOString()
        });
    }, 30000);

    const cleanup = async () => {
        clearInterval(pingInterval);
        await pgClient.end();
        logger.info('PostgreSQL notification listener stopped');
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    return pgClient;
}

export function broadcastEvent(event: any) {
    return broadcastMessage({
        type: 'event',
        data: event
    });
}

export function broadcastMessage(message: WSResponse) {
    let sent = 0;
    let removed = 0;

    for (const client of subscribedClients) {
        if (client.readyState === WebSocket.OPEN) {
            if (sendMessage(client, message)) {
                sent++;
            } else {
                subscribedClients.delete(client);
                removed++;
            }
        } else {
            subscribedClients.delete(client);
            removed++;
        }
    }

    if (removed > 0) {
        logger.debug(`Cleaned up ${removed} dead connections`);
    }

    if (message.type !== 'ping') { // Don't log ping messages
        logger.debug(`Broadcast ${message.type} to ${sent} clients`);
    }

    return sent;
}