import {Client, Pool, PoolClient} from 'pg';
import {logger} from "../logger";

export class AuctionEvent {
    private poolOrClient: Pool | Client | PoolClient;
    private schema: string;

    constructor(poolOrClient: Pool | Client | PoolClient, schema = 'public') {
        this.poolOrClient = poolOrClient;
        this.schema = schema;
    }

    async updateEnrichedEvent(eventId: string, enrichedData: {
        bidderEns?: string | null;
        valueUsd?: number | null;
        winnerEns?: string | null;
        amountUsd?: number | null;
        headline?: string;
    }) {
        // TODO: CLEANUP: This method is a temporary solution to update enriched event data.
        let client: PoolClient | null = null;
        const isPool = 'connect' in this.poolOrClient;

        try {
            if (isPool) {
                client = await (this.poolOrClient as Pool).connect();
            } else {
                client = this.poolOrClient as PoolClient;
            }

            await client.query('BEGIN');

            await client.query(`
                UPDATE ${this.schema}.auction_events
                SET bidder_ens   = $1,
                    value_usd    = $2,
                    winner_ens   = $3,
                    amount_usd   = $4,
                    headline     = $5,
                    processed_at = $6
                WHERE id = $7
            `, [
                enrichedData.bidderEns ?? null,
                enrichedData.valueUsd ?? null,
                enrichedData.winnerEns ?? null,
                enrichedData.amountUsd ?? null,
                enrichedData.headline ?? null,
                Math.floor(Date.now() / 1000),
                eventId
            ]);

            await client.query(`NOTIFY event_updated, '${eventId}'`);
            await client.query('COMMIT');

            logger.debug(`Successfully updated enriched event ${eventId}`);

        } catch (error) {
            if (client) {
                await client.query('ROLLBACK');
            }
            logger.error({msg: `Error processing enriched event ${eventId}`, error});
            throw error;
        } finally {
            if (isPool && client) {
                (client as PoolClient).release();
            }
        }
    }
}
