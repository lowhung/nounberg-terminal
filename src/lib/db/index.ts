import pg from 'pg';
import {AuctionEventRepository} from './repositories/auction-event-repository';

export class DbContext {
    private pool: pg.Pool;
    private _auctionEvents: AuctionEventRepository | null = null;

    constructor(connectionString?: string) {
        this.pool = new pg.Pool({
            connectionString: connectionString || process.env.DATABASE_URL || 'postgres://nounberg:nounberg@localhost:5432/nounberg'
        });
    }

    get auctionEvents(): AuctionEventRepository {
        if (!this._auctionEvents) {
            this._auctionEvents = new AuctionEventRepository(this.pool);
        }
        return this._auctionEvents;
    }

    getPool(): pg.Pool {
        return this.pool;
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}

export function createDbContext(connectionString?: string): DbContext {
    return new DbContext(connectionString);
}

export function createDbClient(connectionString?: string): pg.Client {
    return new pg.Client({
        connectionString: connectionString || process.env.DATABASE_URL || 'postgres://nounberg:nounberg@localhost:5432/nounberg'
    });
}
