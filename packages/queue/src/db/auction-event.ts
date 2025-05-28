import {DbContext} from "./context";


type AuctionEventRecord = {
    id: string;
    type: 'created' | 'bid' | 'settled';
    nounId: number;
    txHash: string;
    blockNumber: number;
    blockTimestamp: bigint;
    logIndex: number;
    startTime: bigint | null;
    endTime: bigint | null;
    bidder: string | null;
    bidderEns: string | null;
    valueWei: string | null;
    valueUsd: string | null;
    extended: boolean | null;
    winner: string | null;
    winnerEns: string | null;
    amountWei: string | null;
    amountUsd: string | null;
    headline: string;
    thumbnailUrl: string | null;
    createdAt: bigint;
    processedAt: bigint | null;
};

export class AuctionEvent {
    private dbContext: DbContext;
    private readonly schema: string;

    constructor(dbContext: DbContext, schema = 'public') {
        this.dbContext = dbContext;
        this.schema = schema;
    }

    async updateEnrichedEvent(eventId: string, enrichedData: {
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

    async getById(eventId: string): Promise<AuctionEventRecord | null> {
        const result = await this.dbContext.query(`
        SELECT * FROM ${this.schema}.auction_events 
        WHERE id = $1
    `, [eventId]);

        return result.rows[0] || null;
    }
}