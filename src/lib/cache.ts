import NodeCache from 'node-cache';
import {Pool, PoolClient} from 'pg';

export class CacheService {
    private client: Pool | PoolClient;
    private ensCache: NodeCache;
    private priceCache: NodeCache;
    // Add a mapping cache to track which timestamps map to which hour
    private timestampHourMapping: NodeCache;

    constructor(client: Pool | PoolClient) {
        this.client = client;

        // Cache ENS names for 2 days in memory
        this.ensCache = new NodeCache({stdTTL: 60 * 60 * 24 * 2});
        // Cache prices for 15 minutes in memory
        this.priceCache = new NodeCache({stdTTL: 60 * 15});
        // Cache timestamp to hour mappings for 24 hours
        this.timestampHourMapping = new NodeCache({stdTTL: 60 * 60 * 24});
    }

    /**
     * Round a timestamp to the nearest hour
     * @param timestamp Unix timestamp in seconds
     * @returns Timestamp rounded to the nearest hour
     */
    private roundToHour(timestamp: number): number {
        return Math.floor(timestamp / 3600) * 3600;
    }

    /**
     * Get cached ENS name for an address
     */
    async getEnsName(address: string): Promise<string | null> {
        if (!address) return null;

        address = address.toLowerCase();

        // Check in-memory cache first
        const cached = this.ensCache.get<string | null>(address);
        if (cached !== undefined) {
            return cached;
        }

        try {
            // Then check database cache
            const result = await this.client.query(
                `SELECT ens_name
                 FROM ens_cache
                 WHERE address = $1
                   AND expires_at > NOW()`,
                [address]
            );

            if (result.rowCount !== null && result.rowCount > 0) {
                const ensName = result.rows[0].ens_name;
                this.ensCache.set(address, ensName);
                return ensName;
            }

            return null;
        } catch (error) {
            console.error(`Error getting ENS name for ${address}:`, error);
            return null;
        }
    }

    /**
     * Cache an ENS name for an address
     */
    async setEnsName(address: string, ensName: string | null): Promise<void> {
        if (!address) return;

        address = address.toLowerCase();

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        // Update in-memory cache
        this.ensCache.set(address, ensName);

        try {
            // Update database cache
            await this.client.query(
                `INSERT INTO ens_cache (address, ens_name, last_checked_at, expires_at)
                 VALUES ($1, $2, NOW(), $3)
                 ON CONFLICT (address)
                     DO UPDATE SET ens_name = $2,
                                   last_checked_at = NOW(),
                                   expires_at      = $3,
                                   updated_at      = NOW()`,
                [address, ensName, expiresAt]
            );
        } catch (error) {
            console.error(`Error caching ENS name for ${address}:`, error);
        }
    }

    /**
     * Get ETH price for a specific timestamp
     * Returns price from the nearest hourly cache point
     */
    async getEthPrice(timestamp: number): Promise<number | null> {
        if (!timestamp) return null;

        // First check if we already have a mapping for this timestamp to an hour
        const mappingKey = `ts_map_${timestamp}`;
        let hourTimestamp = this.timestampHourMapping.get<number>(mappingKey);

        if (hourTimestamp === undefined) {
            // Round to the nearest hour
            hourTimestamp = this.roundToHour(timestamp);
            // Cache this mapping
            this.timestampHourMapping.set(mappingKey, hourTimestamp);
        }

        // Check in-memory cache for this hour
        const cacheKey = `price_${hourTimestamp}`;
        const cached = this.priceCache.get<number | null>(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        try {
            // Check database cache
            const result = await this.client.query(
                `SELECT price_usd
                 FROM eth_price_cache
                 WHERE timestamp = $1
                   AND expires_at > NOW()`,
                [hourTimestamp]
            );

            if (result.rowCount !== null && result.rowCount > 0) {
                const priceUsd = parseFloat(result.rows[0].price_usd);
                // Cache the price for this hour
                this.priceCache.set(cacheKey, priceUsd);
                return priceUsd;
            }

            // If we didn't find the exact hour, try to find the closest hour
            // This helps when backfilling historical data
            const closestResult = await this.client.query(
                `SELECT timestamp, price_usd
                 FROM eth_price_cache
                 WHERE timestamp BETWEEN $1 - 3600 AND $1 + 3600
                 ORDER BY ABS(timestamp - $1)
                 LIMIT 1`,
                [hourTimestamp]
            );

            if (closestResult.rowCount !== null && closestResult.rowCount > 0) {
                const closestPrice = parseFloat(closestResult.rows[0].price_usd);
                const closestTimestamp = parseInt(closestResult.rows[0].timestamp);

                // Store the price under both timestamps to improve cache hits
                this.priceCache.set(cacheKey, closestPrice);
                this.priceCache.set(`price_${closestTimestamp}`, closestPrice);

                return closestPrice;
            }

            return null;
        } catch (error) {
            console.error(`Error getting ETH price for timestamp ${timestamp}:`, error);
            return null;
        }
    }

    /**
     * Cache ETH price for a specific timestamp
     * Always stores at hourly resolution
     */
    async setEthPrice(timestamp: number, priceUsd: number, source: string = 'cryptocompare'): Promise<void> {
        if (!timestamp || priceUsd === undefined || priceUsd === null) return;

        // Round to hour resolution
        const hourTimestamp = this.roundToHour(timestamp);

        // Store mapping from original timestamp to hour
        this.timestampHourMapping.set(`ts_map_${timestamp}`, hourTimestamp);

        // Determine expiration based on age
        const now = Math.floor(Date.now() / 1000);
        const age = now - hourTimestamp;

        const expiresAt = new Date();
        if (age > 24 * 60 * 60) {
            // For historical data (> 1 day old), cache for longer (30 days)
            expiresAt.setDate(expiresAt.getDate() + 30);
        } else if (age > 60 * 60) {
            // For prices 1-24 hours old, cache for 6 hours
            expiresAt.setHours(expiresAt.getHours() + 6);
        } else {
            // For recent prices (< 1 hour old), cache for 15 minutes
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        }

        // Update in-memory cache
        this.priceCache.set(`price_${hourTimestamp}`, priceUsd);

        try {
            // Update database cache
            await this.client.query(
                `INSERT INTO eth_price_cache (timestamp, price_usd, source, expires_at)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (timestamp)
                     DO UPDATE SET price_usd = $2,
                                   source = $3,
                                   expires_at = $4`,
                [hourTimestamp, priceUsd, source, expiresAt]
            );

            // Log cache updates for monitoring
            console.log(`Cached ETH price for hour ${new Date(hourTimestamp * 1000).toISOString()}: $${priceUsd.toFixed(2)} from ${source}`);
        } catch (error) {
            console.error(`Error caching ETH price for timestamp ${timestamp}:`, error);
        }
    }

    /**
     * Get the most recent ETH price
     */
    async getLatestEthPrice(): Promise<number | null> {
        try {
            const result = await this.client.query(
                `SELECT price_usd
                 FROM eth_price_cache
                 WHERE expires_at > NOW()
                 ORDER BY timestamp DESC
                 LIMIT 1`
            );

            if (result.rowCount !== null && result.rowCount > 0) {
                return parseFloat(result.rows[0].price_usd);
            }

            return null;
        } catch (error) {
            console.error('Error getting latest ETH price:', error);
            return null;
        }
    }

    /**
     * Fill price gap for a time range by interpolating between available prices
     */
    async fillPriceGaps(startTimestamp: number, endTimestamp: number): Promise<void> {
        try {
            // Ensure we're working with hourly timestamps
            const startHour = this.roundToHour(startTimestamp);
            const endHour = this.roundToHour(endTimestamp);

            // First, get prices at start and end
            const result = await this.client.query(
                `SELECT timestamp, price_usd
                 FROM eth_price_cache
                 WHERE timestamp IN ($1, $2)`,
                [startHour, endHour]
            );

            if (result.rowCount === 2) {
                // We have both endpoints, we can interpolate
                const prices = result.rows.sort((a, b) => a.timestamp - b.timestamp);
                const startPrice = parseFloat(prices[0].price_usd);
                const endPrice = parseFloat(prices[1].price_usd);
                const startTS = parseInt(prices[0].timestamp);
                const endTS = parseInt(prices[1].timestamp);

                const totalHours = (endTS - startTS) / 3600;
                const priceStep = (endPrice - startPrice) / totalHours;

                // Only interpolate if there's a reasonable gap
                if (totalHours > 1 && totalHours < 48) {
                    // Generate prices for each hour in between
                    for (let hour = 1; hour < totalHours; hour++) {
                        const hourTS = startTS + hour * 3600;
                        const interpolatedPrice = startPrice + (priceStep * hour);

                        // Cache this interpolated price
                        await this.setEthPrice(hourTS, interpolatedPrice, 'interpolated');
                    }
                    console.log(`Filled ${totalHours - 1} price gaps between ${new Date(startTS * 1000).toISOString()} and ${new Date(endTS * 1000).toISOString()}`);
                }
            }
        } catch (error) {
            console.error('Error filling price gaps:', error);
        }
    }
}