import {Hono} from 'hono';
import {createNodeWebSocket} from '@hono/node-ws';
import {createDbClient} from '@/lib/db';
import WebSocket from 'ws';
import logger from '@/lib/logger';

const subscribedClients = new Set<any>();


function snakeToCamel(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel);
    }

    return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = snakeToCamel(obj[key]);
        return result;
    }, {} as Record<string, any>);
}

export function setupWebSockets(app: Hono) {
    const {injectWebSocket, upgradeWebSocket} = createNodeWebSocket({app});

    app.get('/ws', upgradeWebSocket((c) => {
        return {
            onOpen(event, ws) {
                logger.info('WebSocket client connected');
                if (!ws.raw) {
                    logger.error('WebSocket client does not have a raw connection');
                    return;
                }
                subscribedClients.add(ws.raw);

                ws.send(JSON.stringify({
                    type: 'welcome',
                    message: 'Connected to Nounberg Terminal'
                }));
            },
            onMessage(event, ws) {
                try {
                    let data;
                    if (Buffer.isBuffer(event)) {
                        data = JSON.parse(event.toString());
                    } else if (typeof event === 'object') {
                        data = event;
                    } else {
                        logger.error('Received event of unexpected type:', typeof event);
                        return;
                    }
                    if (data.type === 'subscribe') {
                        subscribedClients.add(ws);
                        ws.send(JSON.stringify({type: 'subscribed'}));
                        logger.debug('Client subscribed to events');
                    } else if (data.type === 'unsubscribe') {
                        subscribedClients.delete(ws);
                        ws.send(JSON.stringify({type: 'unsubscribed'}));
                        logger.debug('Client unsubscribed from events');
                    } else if (data.type === 'ping') {
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (error) {
                    logger.error('Error handling WebSocket message:', error, 'Raw message:', event);
                }
            },
            onClose(event, ws) {
                logger.info('WebSocket client disconnected');
                subscribedClients.delete(ws);
            },
            onError(event, ws) {
                logger.error('WebSocket error:', event);
                if (ws.raw) {
                    subscribedClients.delete(ws.raw);
                }
            }
        };
    }));
    logger.info('WebSocket route registered at /ws');
    return {injectWebSocket};
}

export async function startNotificationListener(db: any) {
    try {
        const pgClient = createDbClient();
        await pgClient.connect();

        await pgClient.query('LISTEN  event_created');
        pgClient.on('notification', async (notification) => {
            try {
                const eventId = notification.payload;

                const event = await db.auctionEvents.getEventById(eventId);

                if (!event) {
                    logger.warn(`Event ${eventId} not found in database`);
                    return;
                }

                broadcastMessage({
                    type: 'event',
                    data: event
                });
            } catch (error) {
                logger.error('Error handling notification:', error);
            }
        });

        logger.info('WebSocket notification listener setup complete');

        process.on('SIGINT', async () => {
            await pgClient.end();
        });

        process.on('SIGTERM', async () => {
            await pgClient.end();
        });

        return pgClient;
    } catch (error) {
        logger.error('Error starting notification listener:', error);
        throw error;
    }
}

export function broadcastMessage(message: any) {
    if (message.type === 'event' && message.data) {
        message = {
            type: message.type,
            data: snakeToCamel(message.data)
        };
    }

    let sentCount = 0;
    subscribedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
                sentCount++;
            } catch (err) {
                logger.error('Error sending message to client:', err);
                subscribedClients.delete(client);
            }
        } else if (client.readyState !== WebSocket.CONNECTING) {
            subscribedClients.delete(client);
        }
    });

    logger.debug(`Successfully sent message to ${sentCount} clients`);
    return sentCount;
}