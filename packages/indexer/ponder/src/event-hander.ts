import {formatEther} from "viem";
import {addEventEnrichmentJob} from "./client/queue";
import {
    AuctionBidData,
    AuctionBidDbRecord,
    AuctionCreatedData,
    AuctionCreatedDbRecord,
    AuctionEventDbRecord,
    AuctionSettledData,
    AuctionSettledDbRecord,
    EventData
} from "./types";
import {auctionEvents} from "../ponder.schema";


export class EventHandlerService {
    static async handleAuctionCreated(data: AuctionCreatedData, context: any): Promise<void> {
        const {id, nounId, txHash, blockNumber, blockTimestamp, logIndex, startTime, endTime} = data;

        const dbRecord: AuctionCreatedDbRecord = {
            id,
            type: "created",
            nounId: Number(nounId),
            txHash,
            blockNumber,
            blockTimestamp,
            logIndex,
            startTime,
            endTime,
            headline: `Auction started for Noun #${nounId}`,
            thumbnailUrl: `https://noun.pics/${nounId}`,
            createdAt: BigInt(Math.floor(Date.now() / 1000))
        };

        await this.insertEventRecord(context, dbRecord);
        await this.queueEnrichmentJob(this.convertToEventData(dbRecord));
    }

    static async handleAuctionBid(data: AuctionBidData, context: any): Promise<void> {
        const {id, nounId, sender, value, extended, txHash, blockNumber, blockTimestamp, logIndex} = data;

        const ethValue = formatEther(value);
        const displayBidder = this.formatAddress(sender);

        const dbRecord: AuctionBidDbRecord = {
            id,
            type: "bid",
            nounId: Number(nounId),
            txHash,
            blockNumber,
            blockTimestamp,
            logIndex,
            bidder: sender,
            valueWei: value.toString(),
            extended,
            headline: `Bid placed on Noun #${nounId} for ${ethValue} Ξ by ${displayBidder}`,
            thumbnailUrl: `https://noun.pics/${nounId}`,
            createdAt: BigInt(Math.floor(Date.now() / 1000))
        };

        await this.insertEventRecord(context, dbRecord);
        await this.queueEnrichmentJob(this.convertToEventData(dbRecord));
    }

    static async handleAuctionSettled(data: AuctionSettledData, context: any): Promise<void> {
        const {id, nounId, winner, amount, txHash, blockNumber, blockTimestamp, logIndex} = data;

        const ethAmount = formatEther(amount);
        const displayWinner = this.formatAddress(winner);

        const dbRecord: AuctionSettledDbRecord = {
            id,
            type: "settled",
            nounId: Number(nounId),
            txHash,
            blockNumber,
            blockTimestamp,
            logIndex,
            winner,
            amountWei: amount.toString(),
            headline: `Noun #${nounId} sold for ${ethAmount} Ξ to ${displayWinner}`,
            thumbnailUrl: `https://noun.pics/${nounId}`,
            createdAt: BigInt(Math.floor(Date.now() / 1000))
        };

        await this.insertEventRecord(context, dbRecord);
        await this.queueEnrichmentJob(this.convertToEventData(dbRecord));
    }

    private static async insertEventRecord(context: any, record: AuctionEventDbRecord): Promise<void> {
        try {
            const conflictFields = {
                blockNumber: record.blockNumber,
                blockTimestamp: record.blockTimestamp,
                logIndex: record.logIndex,
                ...(record.type === "bid" && {
                    valueWei: record.valueWei,
                    extended: record.extended
                }),
                ...(record.type === "settled" && {
                    amountWei: record.amountWei
                })
            };

            await context.db.insert(auctionEvents)
                .values(record)
                .onConflictDoUpdate(conflictFields);

        } catch (err) {
            console.error(`Error inserting ${record.type} event: ${err}`);
        }
    }

    private static async queueEnrichmentJob(eventData: EventData): Promise<void> {
        if (!process.env.QUEUE_API_URL) {
            console.warn("QUEUE_API_URL is not set. Skipping enrichment job.");
            return;
        }

        try {
            await addEventEnrichmentJob(eventData);
        } catch (err) {
            console.error(`Error queuing enrichment job for ${eventData.id}: ${err}`);
        }
    }

    private static convertToEventData(dbRecord: AuctionEventDbRecord): EventData {
        const baseEventData = {
            id: dbRecord.id,
            type: dbRecord.type,
            nounId: dbRecord.nounId,
            txHash: dbRecord.txHash,
            blockNumber: dbRecord.blockNumber,
            blockTimestamp: dbRecord.blockTimestamp.toString(),
            logIndex: dbRecord.logIndex,
            headline: dbRecord.headline,
            thumbnailUrl: dbRecord.thumbnailUrl,
            createdAt: dbRecord.createdAt.toString(),
        };

        switch (dbRecord.type) {
            case "created":
                return {
                    ...baseEventData,
                    startTime: dbRecord.startTime.toString(),
                    endTime: dbRecord.endTime.toString(),
                };

            case "bid":
                return {
                    ...baseEventData,
                    bidder: dbRecord.bidder,
                    valueWei: dbRecord.valueWei,
                    extended: dbRecord.extended,
                };

            case "settled":
                return {
                    ...baseEventData,
                    winner: dbRecord.winner,
                    amountWei: dbRecord.amountWei,
                };
        }
    }

    private static formatAddress(address: string): string {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
}