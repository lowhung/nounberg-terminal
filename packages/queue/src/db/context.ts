import pg from 'pg';
import {AuctionEvent} from "./auction-event";
import {logger} from "../logger";

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
            this._auctionEvents = new AuctionEvent(this);
        }
        return this._auctionEvents;
    }

    /**
     * Execute a single query
     */
    async query(text: string, params?: any[]): Promise<pg.QueryResult> {
        return this.pool.query(text, params);
    }

    /**
     * Execute an operation within a transaction
     */
    async withTransaction<T>(operation: (client: pg.PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');
            const result = await operation(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error({msg: 'Transaction failed', error});
            throw error;
        } finally {
            client.release();
        }
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