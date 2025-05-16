import {serve} from '@hono/node-server';
import app from './api';
import {setupWebSockets, startNotificationListener} from './websocket';
import {createDbContext} from '../lib/db';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
    const db = createDbContext();

    const {injectWebSocket} = setupWebSockets(app);

    const server = serve({
        fetch: app.fetch,
        port: PORT
    });

    injectWebSocket(server);

    const notificationClient = await startNotificationListener(db);

    console.log(`Server running on http://localhost:${PORT}`);

    return {server, db, notificationClient};
}

if (require.main === module) {
    start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}

export default app;
