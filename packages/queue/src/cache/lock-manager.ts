import { RedisClient } from './redis-client';
import { logger } from '../logger';

export class LockManager {
    private client: RedisClient;

    constructor(client: RedisClient) {
        this.client = client;
    }

    async withLock<T>(
        key: string,
        operation: () => Promise<T>,
        options: {
            lockTtlSeconds?: number;
            pollIntervalMs?: number;
            maxWaitTimeMs?: number;
        } = {}
    ): Promise<T | null> {
        const lockKey = `lock:${key}`;
        const {
            lockTtlSeconds = 10,
            pollIntervalMs = 200,
            maxWaitTimeMs = 3000
        } = options;

        const trySetLock = await this.client.setLock(lockKey, lockTtlSeconds);

        if (trySetLock) {
            try {
                return await operation();
            } finally {
                await this.client.del(lockKey);
            }
        } else {
            const start = Date.now();
            while (Date.now() - start < maxWaitTimeMs) {
                const result = await this.client.get<T>(key);
                if (result !== null) {
                    logger.debug(`Waited for lock: Hit key ${key}`);
                    return result;
                }
                await new Promise(r => setTimeout(r, pollIntervalMs));
            }
            logger.warn(`Timeout waiting for lock key ${key} to populate`);
            return null;
        }
    }
}
