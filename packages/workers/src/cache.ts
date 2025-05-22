import Memcached from "memcached";
import {Address} from "viem";
import logger from "./logger";

const DEFAULT_TTL = {
    ENS_NAME: 48 * 60 * 60,
    ETH_PRICE_RECENT: 15 * 60,
    ETH_PRICE_OLD: 6 * 60 * 60,
    ETH_PRICE_HISTORICAL: 30 * 24 * 60 * 60,
};

const ENS_UNIVERSAL_RESOLVER_BLOCK = 19258213;

/**
 * Service for interacting with Memcached
 */
export class CacheService {
    private client: Memcached;

    constructor(servers: string = process.env.MEMCACHED_SERVERS || 'localhost:11211') {
        this.client = new Memcached(servers, {
            retries: 3,
            retry: 1000,
            remove: true,
            failOverServers: undefined,
            timeout: 1000,
            reconnect: 1000 * 10,
            poolSize: 10
        });

        this.client.on('failure', (details) => {
            logger.error('Memcached connection failure:', details);
        });

        this.client.on('reconnecting', (details) => {
            logger.info('Memcached reconnecting:', details);
        });

        logger.info(`CacheService initialized with servers: ${servers}`);
    }

    /**
     * Close memcached connection
     */
    close() {
        this.client.end();
    }

    /**
     * Get a value from memcached
     */
    private get<T>(key: string): Promise<T | null> {
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, data) => {
                if (err) {
                    logger.error(`Error getting key ${key} from memcached:`, err);
                    return resolve(null);
                }

                resolve(data as T || null);
            });
        });
    }

    /**
     * Set a value in memcached
     */
    private set<T>(key: string, value: T, ttl: number): Promise<boolean> {
        return new Promise((resolve) => {
            this.client.set(key, value, ttl, (err) => {
                if (err) {
                    logger.error(`Error setting key ${key} in memcached:`, err);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Round a timestamp to the nearest hour
     */
    private roundToHour(timestamp: number | bigint): number {
        if (typeof timestamp === 'bigint') {
            timestamp = Number(timestamp);
        }
        return Math.floor(timestamp / 3600) * 3600;
    }

    /**
     * Get an ENS name - fetches from provider if not in cache
     */
    async getEnsName(
        address: string,
        blockNumber: number,
        provider: any
    ): Promise<string | null> {
        if (!address) return null;

        address = address.toLowerCase();
        const key = `ens:${address}`;

        try {
            const cached = await this.get<string>(key);
            if (cached !== null) {
                return cached;
            }

            if (blockNumber && blockNumber < ENS_UNIVERSAL_RESOLVER_BLOCK) {
                logger.debug(`Block ${blockNumber} is before ENS Universal Resolver deployment, skipping ENS resolution for ${address}`);
                return null;
            }

            const ensName = await provider.getEnsName({address: address as Address});

            await this.set(key, ensName, DEFAULT_TTL.ENS_NAME);

            return ensName;
        } catch (error) {
            logger.error(`Error getting/resolving ENS for ${address}:`, error);
            return null;
        }
    }

    /**
     * Get ETH price for a timestamp - fetches from API if not in cache
     */
    async getEthPrice(timestamp: bigint, axios: any): Promise<number | null> {
        if (!timestamp) return null;

        const hourTimestamp = this.roundToHour(timestamp);
        const key = `eth_price:${hourTimestamp}`;

        try {
            const cached = await this.get<number>(key);
            if (cached !== null) {
                return cached;
            }

            const response = await axios.get(
                'https://min-api.cryptocompare.com/data/pricehistorical',
                {
                    params: {
                        ts: timestamp,
                        fsym: 'ETH',
                        tsyms: 'USD',
                        api_key: '193c7d86141cc605958fee66739113c13a0dbee55f0d66075fa19e7721ceced5'
                    }
                }
            );

            const priceUsd = response.data.ETH?.USD;
            logger.debug(`Fetched ETH price for hour ${new Date(hourTimestamp * 1000).toISOString()}: $${priceUsd} from cryptocompare`);
            if (priceUsd) {
                const now = Math.floor(Date.now() / 1000);
                const age = now - hourTimestamp;
                let ttl = DEFAULT_TTL.ETH_PRICE_RECENT;

                if (age > 24 * 60 * 60) {
                    ttl = DEFAULT_TTL.ETH_PRICE_HISTORICAL;
                } else if (age > 60 * 60) {
                    ttl = DEFAULT_TTL.ETH_PRICE_OLD;
                }

                await this.set(key, priceUsd, ttl);
                logger.debug(`Cached ETH price for hour ${new Date(hourTimestamp * 1000).toISOString()}: $${priceUsd.toFixed(2)} from cryptocompare`);

                return priceUsd;
            }

            return null;
        } catch (error) {
            logger.error(`Error getting ETH price for timestamp ${timestamp}:`, error);
            return null;
        }
    }
}

let cacheServiceInstance: CacheService | null = null;

/**
 * Get the memcached service instance
 */
export function getCacheService(): CacheService {
    if (!cacheServiceInstance) {
        cacheServiceInstance = new CacheService();
    }
    return cacheServiceInstance;
}

/**
 * Close the memcached service instance
 */
export function closeCacheService(): void {
    if (cacheServiceInstance) {
        cacheServiceInstance.close();
        cacheServiceInstance = null;
    }
}