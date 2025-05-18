import {Hono} from 'hono';
import {createNodeWebSocket} from '@hono/node-ws';
import {createDbClient} from '@/lib/db';
import WebSocket from 'ws';

const subscribedClients = new Set<WebSocket>();


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
                console.log('WebSocket client connected');
                if (!ws.raw) {
                    console.error('WebSocket client does not have a raw connection');
                    return;
                }
                subscribedClients.add(ws.raw);

                ws.send(JSON.stringify({
                    type: 'welcome',
                    message: 'Connected to Nounberg Terminal'
                }));
            },
            onMessage(ws, message) {
                try {
                    let data;
                    if (typeof message === 'string') {
                        data = JSON.parse(message);
                    } else if (Buffer.isBuffer(message)) {
                        data = JSON.parse(message.toString());
                    } else if (typeof message === 'object') {
                        data = message;
                    } else {
                        console.error('Received message of unexpected type:', typeof message);
                        return;
                    }
                    if (data.type === 'subscribe') {
                        subscribedClients.add(ws);
                        ws.send(JSON.stringify({type: 'subscribed'}));
                        console.debug('Client subscribed to events');
                    } else if (data.type === 'unsubscribe') {
                        subscribedClients.delete(ws);
                        ws.send(JSON.stringify({type: 'unsubscribed'}));
                        console.debug('Client unsubscribed from events');
                    } else if (data.type === 'ping') {
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (error) {
                    console.error('Error handling WebSocket message:', error, 'Raw message:', message);
                }
            },
            onClose(ws) {
                console.log('WebSocket client disconnected');
                subscribedClients.delete(ws);
            },
            onError(event, ws) {
                console.error('WebSocket error:', event);
                if (ws.raw) {
                    subscribedClients.delete(ws.raw);
                }
            }
        };
    }));
    console.log('WebSocket route registered at /ws');
    return {injectWebSocket};
}

export async function startNotificationListener(db: any) {
    try {
        const pgClient = createDbClient();
        await pgClient.connect();

        await pgClient.query('LISTEN event_updated');
        pgClient.on('notification', async (notification) => {
            try {
                const eventId = notification.payload;

                const event = await db.auctionEvents.getEventById(eventId);

                if (!event) {
                    console.warn(`Event ${eventId} not found in database`);
                    return;
                }

                broadcastMessage({
                    type: 'event',
                    data: event
                });
            } catch (error) {
                console.error('Error handling notification:', error);
            }
        });

        console.log('WebSocket notification listener setup complete');

        process.on('SIGINT', async () => {
            await pgClient.end();
        });

        process.on('SIGTERM', async () => {
            await pgClient.end();
        });

        return pgClient;
    } catch (error) {
        console.error('Error starting notification listener:', error);
        throw error;
    }
}

export function broadcastMessage(message: any) {
    console.log(`Broadcasting message to ${subscribedClients.size} clients:`, message);

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
                console.error('Error sending message to client:', err);
                subscribedClients.delete(client);
            }
        } else if (client.readyState !== WebSocket.CONNECTING) {
            subscribedClients.delete(client);
        }
    });

    console.log(`Successfully sent message to ${sentCount} clients`);
    return sentCount;
}