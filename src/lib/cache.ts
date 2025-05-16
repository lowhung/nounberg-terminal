import NodeCache from 'node-cache';
import {Pool, PoolClient} from 'pg';

export class CacheService {
    private client: Pool | PoolClient;
    private ensCache: NodeCache;
    private priceCache: NodeCache;

    constructor(client: Pool | PoolClient) {
        this.client = client;

        this.ensCache = new NodeCache({stdTTL: 60 * 60 * 24 * 2});
        this.priceCache = new NodeCache({stdTTL: 60 * 15});
    }

    async getEnsName(address: string): Promise<string | null> {
        if (!address) return null;

        address = address.toLowerCase();

        const cached = this.ensCache.get<string | null>(address);
        if (cached !== undefined) {
            return cached;
        }

        try {
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

    async setEnsName(address: string, ensName: string | null): Promise<void> {
        if (!address) return;

        address = address.toLowerCase();

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        this.ensCache.set(address, ensName);

        try {
            await this.client.query(
                `INSERT INTO ens_cache (address, ens_name, last_checked_at, expires_at)
                 VALUES ($1, $2, NOW(), $3) ON CONFLICT (address) 
        DO
                UPDATE SET ens_name = $2, last_checked_at = NOW(),
                    expires_at = $3, updated_at = NOW()`,
                [address, ensName, expiresAt]
            );
        } catch (error) {
            console.error(`Error caching ENS name for ${address}:`, error);
        }
    }

    async getEthPrice(timestamp: number): Promise<number | null> {
        if (!timestamp) return null;

        const roundedTimestamp = Math.floor(timestamp / 3600) * 3600;

        const cached = this.priceCache.get<number | null>(roundedTimestamp.toString());
        if (cached !== undefined) {
            return cached;
        }

        try {
            const result = await this.client.query(
                `SELECT price_usd
                 FROM eth_price_cache
                 WHERE timestamp = $1 AND expires_at > NOW()`,
                [roundedTimestamp]
            );

            if (result.rowCount !== null && result.rowCount > 0) {
                const priceUsd = parseFloat(result.rows[0].price_usd);
                this.priceCache.set(roundedTimestamp.toString(), priceUsd);
                return priceUsd;
            }

            return null;
        } catch (error) {
            console.error(`Error getting ETH price for timestamp ${timestamp}:`, error);
            return null;
        }
    }

    async setEthPrice(timestamp: number, priceUsd: number, source: string = 'coingecko'): Promise<void> {
        if (!timestamp || priceUsd === undefined || priceUsd === null) return;

        const roundedTimestamp = Math.floor(timestamp / 3600) * 3600;

        const now = Math.floor(Date.now() / 1000);
        const age = now - roundedTimestamp;

        const expiresAt = new Date();
        if (age > 24 * 60 * 60) {
            expiresAt.setDate(expiresAt.getDate() + 30);
        } else {
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        }

        this.priceCache.set(roundedTimestamp.toString(), priceUsd);

        try {
            await this.client.query(
                `INSERT INTO eth_price_cache (timestamp, price_usd, source, expires_at)
                 VALUES ($1, $2, $3, $4) ON CONFLICT (timestamp) 
        DO
                UPDATE SET price_usd = $2, source = $3, expires_at = $4`,
                [roundedTimestamp, priceUsd, source, expiresAt]
            );
        } catch (error) {
            console.error(`Error caching ETH price for timestamp ${timestamp}:`, error);
        }
    }

    async cleanupExpiredEntries(): Promise<void> {
        try {
            await this.client.query('DELETE FROM ens_cache WHERE expires_at < NOW()');
            await this.client.query('DELETE FROM eth_price_cache WHERE expires_at < NOW()');

            console.log('Cleaned up expired cache entries');
        } catch (error) {
            console.error('Error cleaning up expired cache entries:', error);
        }
    }
}