import {serve} from '@hono/node-server';
import app from './api';
import {setupWebSockets, startNotificationListener, broadcastMessage} from './websocket';
import {createDbContext} from '@/lib/db';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
    try {
        const db = createDbContext();
        const {injectWebSocket} = setupWebSockets(app);

        const server = serve({
            fetch: app.fetch,
            port: PORT
        });

        injectWebSocket(server);

        const notificationClient = await startNotificationListener(db);

        setTimeout(() => {
            broadcastMessage({
                type: 'test',
                message: 'This is a test message from the server',
                timestamp: new Date().toISOString()
            });
        }, 5000);

        return {server, db, notificationClient};
    } catch (error) {
        console.error('Failed to start server:', error);
        throw error;
    }
}

start().catch(error => {
    console.error('Fatal error during startup:', error);
    process.exit(1);
});

export default app;