import {Client, Pool, PoolClient} from 'pg';
import {logger} from "../../logger";

export class AuctionEvent {
    private poolOrClient: Pool | Client | PoolClient;
    private schema: string;

    constructor(poolOrClient: Pool | Client | PoolClient, schema = 'public') {
        this.poolOrClient = poolOrClient;
        this.schema = schema;
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
                    logger.info(`Event ${id} not found, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            logger.warn(`Event ${id} not found after ${maxAttempts} attempts`);
            return null;
        } catch (error) {
            logger.error(`Error fetching auction event ${id}:`, error);
            throw new Error(`Database error when fetching event: ${(error as Error).message}`);
        }
    }
}
