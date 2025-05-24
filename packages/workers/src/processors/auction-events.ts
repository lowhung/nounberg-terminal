import {formatEther} from 'viem';
import {Job} from 'bullmq';
import {createDbContext} from "../db";
import {EventData} from "../types";
import {getJobProcessingDependencies} from "../queue";
import {logger} from "../logger";
import {CacheService} from "../cache";

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
        const existingEvent = await dbContext.auctionEvents.getEventById(eventId);

        if (!existingEvent) {
            logger.warn(`Event ${eventId} not found in database - it may have been removed in a reorg`);
            return false;
        }

        let valueUsd = null;
        let amountUsd = null;
        let bidderEns = null;
        let winnerEns = null;
        let headline = existingEvent.headline;
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
                UPDATE auction_events
                SET bidder_ens   = $1,
                    value_usd    = $2,
                    winner_ens   = $3,
                    amount_usd   = $4,
                    headline     = $5,
                    processed_at = $6
                WHERE id = $7
            `, [
                bidderEns || null,
                valueUsd || null,
                winnerEns || null,
                amountUsd || null,
                headline,
                Math.floor(Date.now() / 1000),
                eventId
            ]);

            await client.query(`NOTIFY event_updated, '${eventId}'`);

            await client.query('COMMIT');
            logger.debug(`Successfully updated enriched event ${eventId}`);
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Error updating enriched event ${eventId}:`, error);
            return false;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error(`Error processing enrichment job for event ${eventId}:`, error);
        return false;
    }
}