import {logger} from "../logger";
import {DbContext} from "./context";

export class AuctionEvent {
    private dbContext: DbContext;
    private readonly schema: string;

    constructor(dbContext: DbContext, schema = 'public') {
        this.dbContext = dbContext;
        this.schema = schema;
    }

    private async updateEnrichedEvent(eventId: string, enrichedData: {
        bidderEns?: string | null;
        valueUsd?: number | null;
        winnerEns?: string | null;
        amountUsd?: number | null;
        headline?: string;
    }): Promise<{ rowsAffected: number }> {
        let rowsAffected = 0;

        await this.dbContext.withTransaction(async (client) => {
            const result = await client.query(`
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

            rowsAffected = result.rowCount || 0;

            if (rowsAffected > 0) {
                await client.query(`NOTIFY event_updated, '${eventId}'`);
            }
        });

        return { rowsAffected };
    }
    /*
    * Update an enriched event with retry logic
     */
    async updateEnrichedEventRetry(eventId: string, enrichedData: {
        bidderEns?: string | null;
        valueUsd?: number | null;
        winnerEns?: string | null;
        amountUsd?: number | null;
        headline?: string;
    }): Promise<{ rowsAffected: number }> {
        try {
            let result = await this.updateEnrichedEvent(eventId, enrichedData);

            if (result.rowsAffected > 0) {
                logger.debug(`Successfully updated enriched event ${eventId} (${result.rowsAffected} rows affected)`);
                return result;
            }

            logger.debug(`Event ${eventId} not found on first attempt, retrying once after brief delay`);
            await new Promise(resolve => setTimeout(resolve, 100));

            result = await this.updateEnrichedEvent(eventId, enrichedData);

            if (result.rowsAffected === 0) {
                logger.warn(`Event ${eventId} not found for enrichment after retry`);
            } else {
                logger.debug(`Successfully updated enriched event ${eventId} on retry (${result.rowsAffected} rows affected)`);
            }

            return result;

        } catch (error) {
            logger.error({msg: `Error processing enriched event ${eventId}`, error});
            throw error;
        }
    }
}