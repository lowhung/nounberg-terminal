import {Job} from 'bullmq';
import {formatEther} from 'viem';
import {createPublicClient, http} from 'viem';
import {mainnet} from 'viem/chains';
import {BullMQJobResult, EventData} from '../types';
import { createDbContext } from '../db';
import {getCacheService} from "../cache";
import {logger} from "../logger";

export default async function (job: Job<EventData>): Promise<BullMQJobResult> {
    try {
        const eventData = job.data;
        const eventId = eventData.id;
        const {type, nounId, blockNumber, blockTimestamp, winner, amount, bidder, value} = eventData;

        logger.info(`Processing enrichment job for event ${eventId}`);

        const dbContext = createDbContext();
        const cacheService = await getCacheService();

        const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.PONDER_RPC_URL_1;
        const provider = createPublicClient({
            chain: mainnet,
            transport: http(rpcUrl || ''),
        });

        const blockTimestampBigInt = BigInt(blockTimestamp);

        let valueUsd: number | null = null;
        let amountUsd: number | null = null;
        let bidderEns: string | null = null;
        let winnerEns: string | null = null;
        let headline = eventData.headline;

        let priceUsd: number | null = null;
        if (value || amount) {
            priceUsd = await cacheService.getEthPrice(blockTimestampBigInt);
        }

        if (value && priceUsd !== null) {
            const ethValue = parseFloat(formatEther(BigInt(value)));
            valueUsd = ethValue * priceUsd;
        }

        if (amount && priceUsd !== null) {
            const ethAmount = parseFloat(formatEther(BigInt(amount)));
            amountUsd = ethAmount * priceUsd;
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

        await dbContext.auctionEvents.updateEnrichedEvent(eventId, {
            bidderEns,
            valueUsd,
            winnerEns,
            amountUsd,
            headline
        });

        return {success: true, eventId};

    } catch (error: any) {
        logger.error({ msg: `Error processing enrichment job for event ${job.data.id}`, error });
        return {success: false, eventId: job.data.id};
    }
}
