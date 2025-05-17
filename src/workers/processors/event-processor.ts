import pg from 'pg';
import {formatEther} from 'viem';
import {MemcachedService} from '@/lib/cache';
import {AuctionEventRepository} from "@/lib/db/repositories/auction-event-repository";
import {Job} from "@/types/index";


export async function processEnrichEventJob(
    client: pg.PoolClient,
    job: Job,
    cacheService: MemcachedService,
    provider: any,
    axios: any
): Promise<boolean> {
    const {event_id: eventId} = job;

    const auctionEventRepo = new AuctionEventRepository(client);
    try {
        const event = await auctionEventRepo.getEventById(eventId);

        if (!event) {
            throw new Error(`Event ${eventId} not found`);
        }

        const {type, block_number: blockNumber, block_timestamp: blockTimestamp} = event;

        let updatedHeadline = event.headline;
        let valueUsd = null;
        let amountUsd = null;
        let bidderEns = null;
        let winnerEns = null;

        if (event.value) {
            const ethValue = parseFloat(formatEther(BigInt(event.value)));
            const priceUsd = await cacheService.getEthPrice(blockTimestamp, axios);

            if (priceUsd) {
                valueUsd = ethValue * priceUsd;
            }
        }

        if (event.amount) {
            const ethAmount = parseFloat(formatEther(BigInt(event.amount)));
            const priceUsd = await cacheService.getEthPrice(blockTimestamp, axios);

            if (priceUsd) {
                amountUsd = ethAmount * priceUsd;
            }
        }

        if (event.bidder) {
            bidderEns = await cacheService.getEnsName(event.bidder, blockNumber, provider);
        }

        if (event.winner) {
            winnerEns = await cacheService.getEnsName(event.winner, blockNumber, provider);
        }

        if (type === 'bid' && event.value) {
            const ethValue = formatEther(BigInt(event.value));
            const displayName = bidderEns || `${event.bidder.slice(0, 6)}...${event.bidder.slice(-4)}`;

            updatedHeadline = valueUsd
                ? `Bid placed on Noun #${event.noun_id} for ${ethValue} Ξ (${valueUsd.toLocaleString(undefined, {maximumFractionDigits: 0})}) by ${displayName}`
                : `Bid placed on Noun #${event.noun_id} for ${ethValue} Ξ by ${displayName}`;
        } else if (type === 'settled' && event.amount) {
            const ethAmount = formatEther(BigInt(event.amount));
            const displayName = winnerEns || `${event.winner.slice(0, 6)}...${event.winner.slice(-4)}`;

            updatedHeadline = amountUsd
                ? `Noun #${event.noun_id} sold for ${ethAmount} Ξ (${amountUsd.toLocaleString(undefined, {maximumFractionDigits: 0})}) to ${displayName}`
                : `Noun #${event.noun_id} sold for ${ethAmount} Ξ to ${displayName}`;
        }

        await auctionEventRepo.updateEvent(eventId, {
            bidderEns,
            winnerEns,
            valueUsd,
            amountUsd,
            headline: updatedHeadline,
            processedAt: Math.floor(Date.now() / 1000),
        });

        await client.query(`NOTIFY event_updated, '${eventId}'`);
        return true;
    } catch (error) {
        console.error(`Error processing enrichment job for event ${eventId}:`, error);
        return false;
    }
}