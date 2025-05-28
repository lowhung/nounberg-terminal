import Redis from 'ioredis';
import { logger } from '../logger';

export class RedisClient {
    private client: Redis;

    constructor(url: string = process.env.REDIS_URL || 'redis://localhost:6379') {
        this.client = new Redis(url, { db: 1 });
        logger.info(`Redis connection initialized: ${this.client.options.host}`);
    }

    async close() {
        await this.client.quit();
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const val = await this.client.get(key);
            return val ? JSON.parse(val) : null;
        } catch (err) {
            logger.error({ msg: `Redis get error for ${key}`, err });
            return null;
        }
    }

    async set<T>(key: string, value: T, ttl: number): Promise<boolean> {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttl);
            return true;
        } catch (err) {
            logger.error({ msg: `Redis set error for ${key}`, err });
            return false;
        }
    }

    async del(key: string): Promise<boolean> {
        try {
            await this.client.del(key);
            return true;
        } catch (err) {
            logger.error({ msg: `Redis del error for ${key}`, err });
            return false;
        }
    }

    async setLock(key: string, ttl: number): Promise<boolean> {
        try {
            // @ts-ignore
            const result = await this.client.set(key, '1', 'NX', 'EX', ttl);
            return result === 'OK';
        } catch (err) {
            logger.error({ msg: `Redis lock error for ${key}`, err });
            return false;
        }
    }
}
