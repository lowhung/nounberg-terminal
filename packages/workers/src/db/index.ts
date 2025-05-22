import pg from 'pg';
import {AuctionEvent} from "./repositories";

export class DbContext {
    private pool: pg.Pool;
    private _auctionEvents: AuctionEvent | null = null;

    constructor(connectionString?: string) {
        this.pool = new pg.Pool({
            connectionString: connectionString || process.env.DATABASE_URL || 'postgres://nounberg:nounberg@localhost:5432/nounberg'
        });
    }

    get auctionEvents(): AuctionEvent {
        if (!this._auctionEvents) {
            this._auctionEvents = new AuctionEvent(this.pool);
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