import Memcached from "memcached";

const DEFAULT_TTL = {
    ENS_NAME: 48 * 60 * 60,
    ETH_PRICE_RECENT: 15 * 60,
    ETH_PRICE_OLD: 6 * 60 * 60,
    ETH_PRICE_HISTORICAL: 30 * 24 * 60 * 60,
};

/**
 * Service for interacting with Memcached
 */
export class MemcachedService {
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
            console.error('Memcached connection failure:', details);
        });

        this.client.on('reconnecting', (details) => {
            console.log('Memcached reconnecting:', details);
        });

        console.log(`MemcachedService initialized with servers: ${servers}`);
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
    get<T>(key: string): Promise<T | null> {
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, data) => {
                if (err) {
                    console.error(`Error getting key ${key} from memcached:`, err);
                    return resolve(null);
                }

                resolve(data as T || null);
            });
        });
    }

    /**
     * Set a value in memcached
     */
    set<T>(key: string, value: T, ttl: number): Promise<boolean> {
        return new Promise((resolve) => {
            this.client.set(key, value, ttl, (err) => {
                if (err) {
                    console.error(`Error setting key ${key} in memcached:`, err);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Delete a key from memcached
     */
    delete(key: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.client.del(key, (err) => {
                if (err) {
                    console.error(`Error deleting key ${key} from memcached:`, err);
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
    private roundToHour(timestamp: number): number {
        return Math.floor(timestamp / 3600) * 3600;
    }

    /**
     * Get an ENS name from the cache
     */
    async getEnsName(address: string): Promise<string | null> {
        if (!address) return null;

        address = address.toLowerCase();
        const key = `ens:${address}`;

        try {
            return await this.get<string>(key);
        } catch (error) {
            console.error(`Error getting ENS name for ${address}:`, error);
            return null;
        }
    }

    /**
     * Set an ENS name in the cache
     */
    async setEnsName(address: string, ensName: string | null): Promise<void> {
        if (!address) return;

        address = address.toLowerCase();
        const key = `ens:${address}`;

        try {
            await this.set(key, ensName, DEFAULT_TTL.ENS_NAME);
        } catch (error) {
            console.error(`Error caching ENS name for ${address}:`, error);
        }
    }

    /**
     * Get ETH price for a specific timestamp
     */
    async getEthPrice(timestamp: number): Promise<number | null> {
        if (!timestamp) return null;

        const hourTimestamp = this.roundToHour(timestamp);
        const key = `eth_price:${hourTimestamp}`;

        try {
            return await this.get<number>(key);
        } catch (error) {
            console.error(`Error getting ETH price for timestamp ${timestamp}:`, error);
            return null;
        }
    }

    /**
     * Set ETH price for a specific timestamp
     */
    async setEthPrice(timestamp: number, priceUsd: number, source: string = 'cryptocompare'): Promise<void> {
        if (!timestamp || priceUsd === undefined || priceUsd === null) return;

        const hourTimestamp = this.roundToHour(timestamp);
        const key = `eth_price:${hourTimestamp}`;

        const now = Math.floor(Date.now() / 1000);
        const age = now - hourTimestamp;
        let ttl = DEFAULT_TTL.ETH_PRICE_RECENT;

        if (age > 24 * 60 * 60) {
            ttl = DEFAULT_TTL.ETH_PRICE_HISTORICAL;
        } else if (age > 60 * 60) {
            ttl = DEFAULT_TTL.ETH_PRICE_OLD;
        }

        try {
            await this.set(key, priceUsd, ttl);
            console.log(`Cached ETH price for hour ${new Date(hourTimestamp * 1000).toISOString()}: $${priceUsd.toFixed(2)} from ${source}`);
        } catch (error) {
            console.error(`Error caching ETH price for timestamp ${timestamp}:`, error);
        }
    }

    /**
     * Get the most recent ETH price (within the last 24 hours)
     */
    async getLatestEthPrice(): Promise<number | null> {
        const now = Math.floor(Date.now() / 1000);
        const currentHour = this.roundToHour(now);

        const currentPrice = await this.getEthPrice(currentHour);
        if (currentPrice !== null) {
            return currentPrice;
        }

        for (let i = 1; i <= 24; i++) {
            const timestamp = currentHour - (i * 3600);
            const price = await this.getEthPrice(timestamp);
            if (price !== null) {
                return price;
            }
        }

        return null;
    }
}

let memcachedServiceInstance: MemcachedService | null = null;

/**
 * Get the memcached service instance
 */
export function getMemcachedService(): MemcachedService {
    if (!memcachedServiceInstance) {
        memcachedServiceInstance = new MemcachedService();
    }
    return memcachedServiceInstance;
}

/**
 * Close the memcached service instance
 */
export function closeMemcachedService(): void {
    if (memcachedServiceInstance) {
        memcachedServiceInstance.close();
        memcachedServiceInstance = null;
    }
}