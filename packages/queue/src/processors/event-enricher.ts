import {Job} from 'bullmq';
import {formatEther} from 'viem';
import {JobResult, EventData} from '../types';
import { createDbContext } from '../db';
import {getCacheService} from "../cache";
import {logger} from "../logger";

export default async function (job: Job<EventData>): Promise<JobResult> {
    try {
        const eventData = job.data;
        const eventId = eventData.id;
        const {type, nounId, blockNumber, blockTimestamp, winner, amountWei, bidder, valueWei, headline} = eventData;

        logger.debug(`Processing enrichment job for event ${eventId}`);

        const dbContext = createDbContext();
        const cacheService = await getCacheService();

        const blockTimestampBigInt = BigInt(blockTimestamp);

        let valueUsd: number | null = null;
        let amountUsd: number | null = null;
        let bidderEns: string | null = null;
        let winnerEns: string | null = null;
        let updatedHeadline = headline;

        let priceUsd: number | null = null;
        if (valueWei || amountWei) {
            priceUsd = await cacheService.getEthPrice(blockTimestampBigInt);
        }

        if (valueWei && priceUsd !== null) {
            const ethValue = parseFloat(formatEther(BigInt(valueWei)));
            valueUsd = ethValue * priceUsd;
        }

        if (amountWei && priceUsd !== null) {
            const ethAmount = parseFloat(formatEther(BigInt(amountWei)));
            amountUsd = ethAmount * priceUsd;
        }

        if (bidder) {
            bidderEns = await cacheService.getEnsName(bidder, blockNumber);
        }

        if (winner) {
            winnerEns = await cacheService.getEnsName(winner, blockNumber);
        }

        if (type === 'bid' && valueWei) {
            const ethValue = formatEther(BigInt(valueWei));
            const displayName = bidderEns || `${bidder?.slice(0, 6)}...${bidder?.slice(-4)}`;

            updatedHeadline = valueUsd
                ? `Bid placed on Noun #${nounId} for ${ethValue} Ξ ($${valueUsd.toLocaleString(undefined, {maximumFractionDigits: 0})}) by ${displayName}`
                : `Bid placed on Noun #${nounId} for ${ethValue} Ξ by ${displayName}`;
        } else if (type === 'settled' && amountWei) {
            const ethAmount = formatEther(BigInt(amountWei));
            const displayName = winnerEns || `${winner?.slice(0, 6)}...${winner?.slice(-4)}`;

            updatedHeadline = amountUsd
                ? `Noun #${nounId} sold for ${ethAmount} Ξ ($${amountUsd.toLocaleString(undefined, {maximumFractionDigits: 0})}) to ${displayName}`
                : `Noun #${nounId} sold for ${ethAmount} Ξ to ${displayName}`;
        } else if (type === 'created') {
            updatedHeadline = `Auction started for Noun #${nounId}`;
        }

        await dbContext.auctionEvents.updateEnrichedEvent(eventId, {
            bidderEns,
            valueUsd,
            winnerEns,
            amountUsd,
            headline: updatedHeadline,
        });

        return {success: true, eventId};

    } catch (error: any) {
        logger.error({ msg: `Error processing enrichment job for event ${job.data.id}`, error });
        return {success: false, eventId: job.data.id};
    }
}
