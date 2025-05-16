import pg from 'pg';
import {Address, formatEther} from 'viem';
import {CacheService} from '@/lib/cache';
import {Job} from '@/lib/queue';
import {AuctionEventRepository} from "@/lib/db/repositories/auction-event-repository";

// ENS Universal Resolver deployment block
const ENS_UNIVERSAL_RESOLVER_BLOCK = 19258213;


export async function resolveEns(
    address: string,
    blockNumber: number,
    cacheService: CacheService,
    provider: any
): Promise<string | null> {
    if (!address) return null;

    const cachedEns = await cacheService.getEnsName(address);
    if (cachedEns !== null) {
        return cachedEns;
    }

    if (blockNumber && blockNumber < ENS_UNIVERSAL_RESOLVER_BLOCK) {
        console.log(`Block ${blockNumber} is before ENS Universal Resolver deployment, skipping ENS resolution for ${address}`);
        return null;
    }

    try {
        const ensName = await provider.getEnsName({address: address as Address});
        await cacheService.setEnsName(address, ensName);
        return ensName;
    } catch (error) {
        console.error(`Error resolving ENS for ${address}:`, error);
        return null;
    }
}

export async function getEthPrice(
    timestamp: number,
    cacheService: CacheService,
    axios: any
): Promise<number | null> {
    if (!timestamp) return null;

    const cachedPrice = await cacheService.getEthPrice(timestamp);
    if (cachedPrice !== null) {
        return cachedPrice;
    }

    try {
        const response = await axios.get(
            'https://min-api.cryptocompare.com/data/pricehistorical',
            {
                params: {
                    ts: timestamp,
                    fsym: 'ETH',
                    tsyms: 'USD',
                    api_key: '193c7d86141cc605958fee66739113c13a0dbee55f0d66075fa19e7721ceced5'
                }
            }
        );

        const priceUsd = response.data.ETH?.USD;
        if (priceUsd) {
            await cacheService.setEthPrice(timestamp, priceUsd, 'cryptocompare');
            return priceUsd;
        }

        return null;
    } catch (error) {
        console.error(`Error getting ETH price for timestamp ${timestamp}:`, error);
        return null;
    }
}

export async function processEnrichEventJob(
    client: pg.PoolClient,
    job: Job,
    cacheService: CacheService,
    provider: any,
    axios: any
): Promise<boolean> {
    const {event_id: eventId, data} = job;

    // Create a repository using the passed client
    const auctionEventRepo = new AuctionEventRepository(client);
    try {
        // Get the event using the repository
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
            const priceUsd = await getEthPrice(blockTimestamp, cacheService, axios);

            if (priceUsd) {
                valueUsd = ethValue * priceUsd;
            }
        }

        if (event.amount) {
            const ethAmount = parseFloat(formatEther(BigInt(event.amount)));
            const priceUsd = await getEthPrice(blockTimestamp, cacheService, axios);

            if (priceUsd) {
                amountUsd = ethAmount * priceUsd;
            }
        }

        if (event.bidder) {
            bidderEns = await resolveEns(event.bidder, blockNumber, cacheService, provider);
        }

        if (event.winner) {
            winnerEns = await resolveEns(event.winner, blockNumber, cacheService, provider);
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

        // Update the event using the repository
        await auctionEventRepo.updateEvent(eventId, {
            bidderEns,
            winnerEns,
            valueUsd,
            amountUsd,
            headline: updatedHeadline,
            processedAt: Math.floor(Date.now() / 1000),
        });

        // Notify any listeners about the updated event
        await client.query(`NOTIFY event_updated, '${eventId}'`);
        return true;
    } catch (error) {
        console.error(`Error processing enrichment job for event ${eventId}:`, error);
        return false;
    }
}