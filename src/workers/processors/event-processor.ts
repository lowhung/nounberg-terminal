import {formatEther} from 'viem';
import {Job} from 'bullmq';
import {EventData} from "@/types";
import {CacheService} from "@/lib/cache";
import {createDbContext} from "@/lib/db";
import {getJobProcessingDependencies} from "@/lib/queue";
import logger from "@/lib/logger";

const dbContext = createDbContext();

export async function processEnrichEventJob(
    job: Job
): Promise<{ success: boolean; eventId: string }> {
    try {
        const eventData = job.data as EventData;
        const eventId = eventData.id;

        const {cacheService, provider, axios} = getJobProcessingDependencies();

        const success = await processEventData(eventData, cacheService, provider, axios);
        return {success, eventId};
    } catch (error) {
        logger.error(`Error in job processing wrapper:`, error);
        return {success: false, eventId: job.data.id};
    }
}

async function processEventData(
    eventData: EventData,
    cacheService: CacheService,
    provider: any,
    axios: any
): Promise<boolean> {
    const eventId = eventData.id;
    const {type, nounId, blockNumber, blockTimestamp, winner, amount, bidder, value, thumbnailUrl} = eventData;

    try {
        const existingEvent = await dbContext.auctionEvents.eventExists(eventId);
        if (existingEvent) {
            logger.info(`Event ${eventId} already exists, skipping enrichment`);
            return true;
        }

        let valueUsd = null;
        let amountUsd = null;
        let bidderEns = null;
        let winnerEns = null;
        let headline = '';

        const blockTimestampBigInt = BigInt(blockTimestamp);

        if (value) {
            const ethValue = parseFloat(formatEther(BigInt(value)));
            const priceUsd = await cacheService.getEthPrice(blockTimestampBigInt, axios);

            if (priceUsd) {
                valueUsd = ethValue * priceUsd;
            }
        }

        if (amount) {
            const ethAmount = parseFloat(formatEther(BigInt(amount)));
            const priceUsd = await cacheService.getEthPrice(blockTimestampBigInt, axios);

            if (priceUsd) {
                amountUsd = ethAmount * priceUsd;
            }
        }

        if (bidder) {
            bidderEns = await cacheService.getEnsName(bidder, blockNumber, provider);
        }

        if (winner) {
            winnerEns = await cacheService.getEnsName(winner, blockNumber, provider);
        }

        if (type === 'bid' && value) {
            const ethValue = formatEther(BigInt(value));
            const displayName = bidderEns || `${bidder?.slice(0, 6)}...${bidder?.slice(-4)}`;

            headline = valueUsd
                ? `Bid placed on Noun #${nounId} for ${ethValue} Ξ ($${valueUsd.toLocaleString(undefined, {maximumFractionDigits: 0})}) by ${displayName}`
                : `Bid placed on Noun #${nounId} for ${ethValue} Ξ by ${displayName}`;
        } else if (type === 'settled' && amount) {
            const ethAmount = formatEther(BigInt(amount));
            const displayName = winnerEns || `${winner?.slice(0, 6)}...${winner?.slice(-4)}`;

            headline = amountUsd
                ? `Noun #${nounId} sold for ${ethAmount} Ξ ($${amountUsd.toLocaleString(undefined, {maximumFractionDigits: 0})}) to ${displayName}`
                : `Noun #${nounId} sold for ${ethAmount} Ξ to ${displayName}`;
        } else if (type === 'created') {
            headline = `Auction started for Noun #${nounId}`;
        }

        const pool = dbContext.getPool();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            await client.query(`
                INSERT INTO auction_events (id, type, noun_id, tx_hash, block_number, block_timestamp, log_index,
                                            bidder, bidder_ens, value, value_usd,
                                            winner, winner_ens, amount, amount_usd,
                                            headline, thumbnail_url, created_at, processed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7,
                        $8, $9, $10, $11,
                        $12, $13, $14, $15,
                        $16, $17, $18, $19)
                ON CONFLICT (id) DO NOTHING
            `, [
                eventId,
                type,
                nounId,
                eventData.txHash,
                blockNumber,
                blockTimestampBigInt,
                eventData.logIndex,
                bidder || null,
                bidderEns || null,
                value || null,
                valueUsd || null,
                winner || null,
                winnerEns || null,
                amount || null,
                amountUsd || null,
                headline,
                thumbnailUrl || null,
                eventData.createdAt,
                Math.floor(Date.now() / 1000)
            ]);

            await client.query(`NOTIFY event_created, '${eventId}'`);

            await client.query('COMMIT');
            logger.debug(`Successfully inserted enriched event ${eventId}`);
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Error inserting enriched event ${eventId}:`, error);
            return false;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error(`Error processing enrichment job for event ${eventId}:`, error);
        return false;
    }
}