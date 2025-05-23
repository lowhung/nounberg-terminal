import pino from 'pino';

function determineServiceName() {
    if (process.env.SERVICE_NAME) {
        return process.env.SERVICE_NAME;
    }

    const execPath = process.argv[1] || '';
    if (execPath.includes('workers')) {
        return 'workers';
    } else if (execPath.includes('api')) {
        return 'api';
    } else if (execPath.includes('ponder')) {
        return 'indexer';
    }

    return 'app';
}

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        service: determineServiceName(),
    },
    timestamp: true,
    messageKey: 'msg',
    formatters: {
        level(label, number) {
            return {level: number};
        }
    }
});

export default logger;
