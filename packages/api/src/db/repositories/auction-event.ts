import {Client, Pool, PoolClient} from 'pg';
import logger from "../../logger";

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
            logger.error('Error fetching auction events:', error);
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
            logger.error(`Error fetching auction event ${id}:`, error);
            throw new Error(`Database error when fetching event: ${(error as Error).message}`);
        }
    }
}
