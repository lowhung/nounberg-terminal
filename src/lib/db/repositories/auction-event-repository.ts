import {Client, Pool, PoolClient} from 'pg';

export class AuctionEventRepository {
    private poolOrClient: Pool | Client | PoolClient;
    private schema: string;

    constructor(poolOrClient: Pool | Client | PoolClient, schema = 'public') {
        this.poolOrClient = poolOrClient;
        this.schema = schema;
    }

    /**
     * Get paginated auction events with optional filtering
     */
    async getEvents({
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
            throw new Error(`Database error when fetching events: ${error.message}`);
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
                    console.log(`Event ${id} not found, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            console.warn(`Event ${id} not found after ${maxAttempts} attempts`);
            return null;
        } catch (error) {
            console.error(`Error fetching auction event ${id}:`, error);
            throw new Error(`Database error when fetching event: ${error.message}`);
        }
    }

    /**
     * Update an existing auction event with enriched data
     */
    async updateEvent(
        id: string,
        data: {
            bidderEns?: string | null;
            winnerEns?: string | null;
            valueUsd?: number | null;
            amountUsd?: number | null;
            headline?: string;
            processedAt?: number;
        }
    ) {
        try {
            const result = await this.poolOrClient.query(
                `UPDATE ${this.schema}.auction_events
                 SET bidder_ens   = COALESCE($1, bidder_ens),
                     winner_ens   = COALESCE($2, winner_ens),
                     value_usd    = COALESCE($3, value_usd),
                     amount_usd   = COALESCE($4, amount_usd),
                     headline     = COALESCE($5, headline),
                     processed_at = COALESCE($6, processed_at)
                 WHERE id = $7
                 RETURNING *`,  // Return the updated row
                [
                    data.bidderEns,
                    data.winnerEns,
                    data.valueUsd,
                    data.amountUsd,
                    data.headline,
                    data.processedAt,
                    id
                ]
            );

            if (result.rowCount === 0) {
                console.warn(`No auction event with ID ${id} found to update`);
                return false;
            }

            console.log(`Successfully updated auction event ${id}`);
            return true;
        } catch (error) {
            console.error(`Error updating auction event ${id}:`, error);
            return false;
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

    /**
     * Get the count of events by type
     */
    async getEventCounts(): Promise<Record<string, number>> {
        try {
            const result = await this.poolOrClient.query(
                `SELECT type, COUNT(*) as count
                 FROM ${this.schema}.auction_events
                 GROUP BY type`
            );

            const counts: Record<string, number> = {};
            result.rows.forEach(row => {
                counts[row.type] = parseInt(row.count);
            });

            return counts;
        } catch (error) {
            console.error('Error getting event counts:', error);
            return {};
        }
    }
}