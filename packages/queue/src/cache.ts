import Redis from 'ioredis';
import { Address } from 'viem';
import { logger } from './logger';
import {roundToHour} from "./utils/time";
import {DEFAULT_TTL, ENS_UNIVERSAL_RESOLVER_BLOCK} from "./constants";


async function fetchEthHistoricalPrice(apiKey: string, startTime: string, endTime: string): Promise<number | null> {
    const url = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/historical`;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'ETH', startTime, endTime, interval: '1h' })
    };

    try {
        logger.debug(`Fetching ETH price from Alchemy: ${startTime} - ${endTime}`);
        const response = await fetch(url, options);
        const body = await response.json();
        if (body?.data && body.data.length > 0) {
            return parseFloat(body.data[0].value);
        }
        return null;
    } catch (error) {
        logger.error({ msg: 'Error fetching ETH historical price from Alchemy', error });
        return null;
    }
}

export class CacheService {
    private client: Redis;
    private inflight: Map<string, Promise<number | null>> = new Map();
    private readonly apiKey: string;

    constructor(url: string = process.env.REDIS_URL || 'redis://localhost:6379', apiKey?: string) {
        this.client = new Redis(url, { db: 1 });
        this.apiKey = apiKey || process.env.ALCHEMY_API_KEY || process.env.PONDER_RPC_URL_1?.split('/').pop() || '';
        logger.info(`CacheService initialized with Redis at ${url}`);
    }

    async close() {
        await this.client.quit();
    }

    private async get<T>(key: string): Promise<T | null> {
        try {
            const val = await this.client.get(key);
            return val ? JSON.parse(val) : null;
        } catch (err) {
            logger.error({ msg: `Redis get error for ${key}`, err });
            return null;
        }
    }

    private async set<T>(key: string, value: T, ttl: number): Promise<boolean> {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttl);
            return true;
        } catch (err) {
            logger.error({ msg: `Redis set error for ${key}`, err });
            return false;
        }
    }

    async getEnsName(address: string, blockNumber: number, provider: any): Promise<string | null> {
        address = address.toLowerCase();
        const key = `cache:ens:${address}`;

        const cached = await this.get<string>(key);
        if (cached !== null) return cached;

        if (blockNumber < ENS_UNIVERSAL_RESOLVER_BLOCK) {
            logger.debug(`Block ${blockNumber} is before ENS resolver, skipping ENS for ${address}`);
            return null;
        }

        try {
            const ensName = await provider.getEnsName({ address: address as Address });
            await this.set(key, ensName, DEFAULT_TTL.ENS_NAME);
            return ensName;
        } catch (error) {
            logger.error({ msg: `Error resolving ENS for ${address}`, error });
            return null;
        }
    }

    async getEthPrice(timestamp: bigint): Promise<number | null> {
        const hourTimestamp = roundToHour(timestamp);
        const key = `cache:eth_price:${hourTimestamp}`;

        if (this.inflight.has(key)) {
            const inflight = this.inflight.get(key);
            if (inflight) {
                return await inflight;
            }
        }

        const promise = this._getEthPriceInternal(key, hourTimestamp);
        this.inflight.set(key, promise);

        try {
            return await promise;
        } finally {
            this.inflight.delete(key);
        }
    }

    private async _getEthPriceInternal(key: string, hourTimestamp: number): Promise<number | null> {
        const lockKey = `lock:${key}`;
        const lockTtlSeconds = 10;
        const pollIntervalMs = 200;
        const maxWaitTimeMs = 3000;

        // @ts-ignore
        const trySetLock = await this.client.set(lockKey, '1', { NX: true, EX: lockTtlSeconds });

        const fetchAndCache = async (): Promise<number | null> => {
            if (!this.apiKey) {
                logger.warn('No Alchemy API key found');
                return null;
            }

            const hourDate = new Date(hourTimestamp * 1000);
            const startTime = hourDate.toISOString();
            const endTime = new Date(hourDate.getTime() + 3600000).toISOString();

            const price = await fetchEthHistoricalPrice(this.apiKey, startTime, endTime);

            if (price !== null) {
                const now = Math.floor(Date.now() / 1000);
                const age = now - hourTimestamp;
                let ttl = DEFAULT_TTL.ETH_PRICE_RECENT;

                if (age > 24 * 3600) ttl = DEFAULT_TTL.ETH_PRICE_HISTORICAL;
                else if (age > 3600) ttl = DEFAULT_TTL.ETH_PRICE_OLD;

                await this.set(key, price, ttl);
            }

            return price;
        };

        if (trySetLock) {
            try {
                const cached = await this.get<number>(key);
                if (cached !== null) {
                    logger.info(`Cache Hit for key ${key}`);
                    return cached;
                }
                return await fetchAndCache();
            } finally {
                await this.client.del(lockKey);
            }
        } else {
            const start = Date.now();
            while (Date.now() - start < maxWaitTimeMs) {
                const result = await this.get<number>(key);
                if (result !== null) {
                    logger.info(`Waited for cache: Hit key ${key}`);
                    return result;
                }
                await new Promise(r => setTimeout(r, pollIntervalMs));
            }
            logger.warn(`Timeout waiting for ETH price key ${key} to populate`);
            return null;
        }
    }
}

let cacheServiceInstance: CacheService | null = null;

export async function getCacheService(): Promise<CacheService> {
    if (!cacheServiceInstance) {
        cacheServiceInstance = new CacheService();
    }
    return cacheServiceInstance;
}

export async function closeCacheService(): Promise<void> {
    if (cacheServiceInstance) {
        await cacheServiceInstance.close();
        cacheServiceInstance = null;
    }
}
