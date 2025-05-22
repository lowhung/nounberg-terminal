import {Client, Pool, PoolClient} from 'pg';

export class AuctionEvent {
    private poolOrClient: Pool | Client | PoolClient;
    private schema: string;

    constructor(poolOrClient: Pool | Client | PoolClient, schema = 'public') {
        this.poolOrClient = poolOrClient;
        this.schema = schema;
    }

    /**
     * Get paginated auction events with offset-based pagination
     */
    async getEvents({
                        offset = 0,
                        limit = 10,
                        type
                    }: {
        offset?: number;
        limit?: number;
        type?: string;
    }) {
        let query = `
            SELECT *
            FROM ${this.schema}.auction_events
            WHERE 1 = 1
        `;
        const params: any[] = [];

        if (type) {
            query += ` AND type = $${params.length + 1}`;
            params.push(type);
        }

        query += ` ORDER BY block_timestamp DESC, log_index DESC`;
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        try {
            const result = await this.poolOrClient.query(query, params);

            return {
                events: result.rows,
                count: result.rows.length,
                offset
            };
        } catch (error) {
            console.error('Error fetching auction events:', error);
            throw new Error(`Database error when fetching events: ${(error as Error).message}`);
        }
    }

    /**
     * Get paginated auction events with cursor-based pagination
     */
    async getEventsCursor({
                              cursor,
                              limit = 10,
                              type
                          }: {
        cursor?: string;
        limit?: number;
        type?: string;
    }) {
        let query = `
            SELECT *
            FROM ${this.schema}.auction_events
            WHERE 1 = 1
        `;
        const params: any[] = [];

        if (type) {
            query += ` AND type = $${params.length + 1}`;
            params.push(type);
        }

        if (cursor) {
            try {
                const [timestamp, logIndex] = cursor.split('_').map(Number);

                if ((timestamp !== undefined && !isNaN(timestamp)) && (logIndex !== undefined && !isNaN(logIndex))) {
                    query += ` AND (block_timestamp < $${params.length + 1} OR (block_timestamp = $${params.length + 1} AND log_index < $${params.length + 2}))`;
                    params.push(timestamp, logIndex);
                }
            } catch (error) {
                console.error('Invalid cursor format:', error);
            }
        }

        query += ` ORDER BY block_timestamp DESC, log_index DESC`;
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);

        try {
            const result = await this.poolOrClient.query(query, params);

            let nextCursor = null;
            if (result.rows.length === limit) {
                const lastItem = result.rows[result.rows.length - 1];
                nextCursor = `${lastItem.block_timestamp}_${lastItem.log_index}`;
            }

            return {
                events: result.rows,
                nextCursor,
                count: result.rows.length
            };
        } catch (error) {
            console.error('Error fetching auction events:', error);
            throw new Error(`Database error when fetching events: ${(error as Error).message}`);
        }
    }

    async getEventById(id: string) {
        try {
            let attempts = 0;
            const maxAttempts = 3;
            const baseDelay = 500; // 500ms base delay

            while (attempts < maxAttempts) {
                const result = await this.poolOrClient.query(
                    `SELECT *
                     FROM ${this.schema}.auction_events
                     WHERE id = $1`,
                    [id]
                );

                if (result.rows.length > 0) {
                    return result.rows[0];
                }

                attempts++;
                if (attempts < maxAttempts) {
                    const delay = baseDelay * Math.pow(2, attempts - 1);
                    console.info(`Event ${id} not found, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            console.warn(`Event ${id} not found after ${maxAttempts} attempts`);
            return null;
        } catch (error) {
            console.error(`Error fetching auction event ${id}:`, error);
            throw new Error(`Database error when fetching event: ${(error as Error).message}`);
        }
    }

    /**
     * Check if an event exists
     */
    async eventExists(id: string): Promise<boolean> {
        try {
            const result = await this.poolOrClient.query(
                `SELECT 1
                 FROM ${this.schema}.auction_events
                 WHERE id = $1
                 LIMIT 1`,
                [id]
            );
            return result.rowCount !== null && result.rowCount > 0;
        } catch (error) {
            console.error(`Error checking if event ${id} exists:`, error);
            return false;
        }
    }
}
