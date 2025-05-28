import pg from 'pg';
import {AuctionEvent} from "./auction-event";

class DbContext {
    private readonly pool: pg.Pool;
    private _auctionEvents: AuctionEvent | null = null;

    constructor(connectionString?: string) {
        this.pool = new pg.Pool({
            connectionString: connectionString || process.env.DATABASE_URL || 'postgres://nounberg:nounberg@localhost:5432/nounberg',
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
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
        if (this.pool) {
            await this.pool.end();
        }
    }
}

let dbContextInstance: DbContext | null = null;

export function createDbContext(connectionString?: string): DbContext {
    if (!dbContextInstance) {
        dbContextInstance = new DbContext(connectionString);
    }
    return dbContextInstance;
}

export {DbContext};