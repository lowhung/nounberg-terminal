import {Pool} from 'pg';

export class AuctionEventRepository {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    async getEvents({
                        cursor,
                        limit = 10,
                        type
                    }: {
        cursor?: string;
        limit?: number;
        type?: string;
    }) {
        // Build query
        let query = `
            SELECT *
            FROM auction_events
            WHERE 1 = 1
        `;
        const params: any[] = [];

        // Filter by type if specified
        if (type) {
            query += ` AND type = $${params.length + 1}`;
            params.push(type);
        }

        // Pagination using cursor (block_timestamp and log_index)
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

        const result = await this.pool.query(query, params);

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
    }

    async getEventById(id: string) {
        const result = await this.pool.query(
            `SELECT *
             FROM auction_events
             WHERE id = $1`,
            [id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

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
            await this.pool.query(
                `UPDATE auction_events
                 SET bidder_ens   = COALESCE($1, bidder_ens),
                     winner_ens   = COALESCE($2, winner_ens),
                     value_usd    = COALESCE($3, value_usd),
                     amount_usd   = COALESCE($4, amount_usd),
                     headline     = COALESCE($5, headline),
                     processed_at = COALESCE($6, processed_at)
                 WHERE id = $7`,
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
            return true;
        } catch (error) {
            console.error(`Error updating auction event ${id}:`, error);
            return false;
        }
    }
}