import { RedisClient } from './redis-client';
import { LockManager } from './lock-manager';
import { PriceService } from '../services/price-service';
import { EnsService } from '../services/ens-service';
import { logger } from '../logger';
import { roundToHour } from '../utils/time';
import { DEFAULT_TTL, TIME } from '../constants';

export class CacheService {
    private readonly redisClient: RedisClient;
    private lockManager: LockManager;
    private priceService: PriceService;
    private ensService: EnsService;
    private inflight: Map<string, Promise<number | null>> = new Map();

    constructor(redisUrl?: string, apiKey?: string, rpcUrl?: string) {
        this.redisClient = new RedisClient(redisUrl);
        this.lockManager = new LockManager(this.redisClient);
        this.priceService = new PriceService(apiKey);
        this.ensService = new EnsService(rpcUrl);
    }

    async close() {
        await this.redisClient.close();
    }

    async getEnsName(address: string, blockNumber: number): Promise<string | null> {
        address = address.toLowerCase();
        const key = `cache:ens:${address}`;

        const cached = await this.redisClient.get<string>(key);
        if (cached !== null) return cached;

        const ensName = await this.ensService.resolveEnsName(address, blockNumber);
        await this.redisClient.set(key, ensName, DEFAULT_TTL.ENS_NAME);
        return ensName;
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

        const promise = this._getEthPrice(key, hourTimestamp);
        this.inflight.set(key, promise);

        try {
            return await promise;
        } finally {
            this.inflight.delete(key);
        }
    }

    private async _getEthPrice(cacheKey: string, hourlyTimestamp: number): Promise<number | null> {
        return await this.lockManager.withLock(cacheKey, async () => {
            const cachedPrice = await this.redisClient.get<number>(cacheKey);
            if (cachedPrice !== null) {
                logger.debug(`Cache hit for ETH price key ${cacheKey}`);
                return cachedPrice;
            }

            const hourStartDate = new Date(hourlyTimestamp * 1000);
            const hourEndDate = new Date(hourStartDate.getTime() + TIME.HOUR * 1000);
            
            const startTimeIso = hourStartDate.toISOString();
            const endTimeIso = hourEndDate.toISOString();

            const fetchedPrice = await this.priceService.fetchEthHistoricalPrice(startTimeIso, endTimeIso);

            if (fetchedPrice !== null) {
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const priceAgeSeconds = currentTimestamp - hourlyTimestamp;
                
                let cacheTtl = DEFAULT_TTL.ETH_PRICE_RECENT;
                if (priceAgeSeconds > TIME.DAY) {
                    cacheTtl = DEFAULT_TTL.ETH_PRICE_HISTORICAL;
                } else if (priceAgeSeconds > TIME.HOUR) {
                    cacheTtl = DEFAULT_TTL.ETH_PRICE_OLD;
                }

                await this.redisClient.set(cacheKey, fetchedPrice, cacheTtl);
            }

            return fetchedPrice;
        }, {
            lockTtlSeconds: 30 * TIME.SECOND,
            maxWaitTimeMs: 25 * TIME.SECOND * 1000,
            pollIntervalMs: 500
        });
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
