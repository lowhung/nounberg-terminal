import {Job} from 'bullmq';
import {EventData, JobResult} from '../types';
import {getCacheService} from "../cache";
import {logger} from "../logger";
import {createDbContext} from "../db/context";
import {convertWeiToUsd} from "../utils/formatters";
import {generateHeadline} from "../utils/headlines";

interface EnhancedData {
    bidderEns?: string | null;
    valueUsd?: number | null;
    winnerEns?: string | null;
    amountUsd?: number | null;
    headline: string;
}

export default async function (job: Job<EventData>): Promise<JobResult> {
    const eventId = job.data.id;

    try {
        logger.debug(`Processing enrichment job for event ${eventId}`);

        const [dbContext, cacheService] = await Promise.all([
            createDbContext(),
            getCacheService()
        ]);

        const enhancedData = await enhanceEventData(job.data, cacheService);

        const {rowsAffected} = await dbContext.auctionEvents.updateEnrichedEventRetry(eventId, enhancedData);

        return {success: !!rowsAffected, eventId};

    } catch (error: any) {
        logger.error({msg: `Error processing enrichment job for event ${eventId}`, error});
        return {success: false, eventId};
    }
}

async function enhanceEventData(eventData: EventData, cacheService: any): Promise<EnhancedData> {
    const {type, nounId, blockNumber, blockTimestamp, winner, amountWei, bidder, valueWei} = eventData;

    const [bidderEns, winnerEns, ethPrice] = await Promise.all([
        bidder ? cacheService.getEnsName(bidder, blockNumber) : null,
        winner ? cacheService.getEnsName(winner, blockNumber) : null,
        (valueWei || amountWei) ? cacheService.getEthPrice(BigInt(blockTimestamp)) : null,
    ]);

    const valueUsd = convertWeiToUsd(valueWei, ethPrice)
    const amountUsd = convertWeiToUsd(amountWei, ethPrice);

    const headline = generateHeadline({
        type,
        nounId,
        bidder,
        winner,
        valueWei,
        amountWei,
        bidderEns,
        winnerEns,
        valueUsd,
        amountUsd,
    });

    return {
        bidderEns,
        valueUsd,
        winnerEns,
        amountUsd,
        headline,
    };
}