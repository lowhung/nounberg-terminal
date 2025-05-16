import {createNodeWebSocket} from '@hono/node-ws';
import {createDbClient} from '../lib/db';
import WebSocket from "ws";
import {Context} from "hono";

const subscribedClients = new Set<any>();

/**
 * Configure WebSocket for the Hono app
 * @param app Hono app
 * @returns WebSocket configuration
 */
export function setupWebSockets(app: any) {
    const {injectWebSocket, upgradeWebSocket} = createNodeWebSocket({app});

    app.get('/ws', upgradeWebSocket((c: Context) => {
        return {
            onOpen(event: Event, ws) {
                console.log('WebSocket client connected');
                ws.send(JSON.stringify({type: 'welcome', message: 'Connected to Nounberg Terminal'}));
            },
            onMessage(message, ws) {
                try {
                    const data = JSON.parse(message.toString());
                    console.log('Received message from client:', data);

                    // Handle subscription request
                    if (data.type === 'subscribe') {
                        subscribedClients.add(ws);
                        ws.send(JSON.stringify({type: 'subscribed'}));
                    }

                    // Handle unsubscribe request
                    if (data.type === 'unsubscribe') {
                        subscribedClients.delete(ws);
                        ws.send(JSON.stringify({type: 'unsubscribed'}));
                    }
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            },
            onClose(ws) {
                console.log('WebSocket client disconnected');
                subscribedClients.delete(ws);
            },
            onError(ws, error) {
                console.error('WebSocket error:', error);
                subscribedClients.delete(ws);
            }
        };
    }));

    return {injectWebSocket};
}

/**
 * Start the database notification listener
 * @param db Database context
 */
export async function startNotificationListener(db: any) {
    try {
        // Create a dedicated client for notifications
        const pgClient = createDbClient();

        // Connect to database
        await pgClient.connect();

        // Listen for event_updated notifications
        await pgClient.query('LISTEN event_updated');

        // Handle notifications
        pgClient.on('notification', async (notification) => {
            try {
                const eventId = notification.payload;

                // Get the updated event using the repository
                const event = await db.auctionEvents.getEventById(eventId);

                if (!event) {
                    console.warn(`Event ${eventId} not found`);
                    return;
                }

                // Broadcast to all subscribed clients
                subscribedClients.forEach((client: WebSocket) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'event',
                            data: event
                        }));
                    }
                });
            } catch (error) {
                console.error('Error handling event notification:', error);
            }
        });

        console.log('WebSocket notification listener started');

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