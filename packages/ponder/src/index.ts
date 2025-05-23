import {ponder} from "ponder:registry";
import {formatEther} from "viem";
import {auctionEvents} from "../ponder.schema";
import logger from "./logger";
import {EventData} from "./types";
import {addEventEnrichmentJob} from "./client/workers";

ponder.on("NounsAuctionHouse:AuctionCreated", async ({event, context}) => {
    const {nounId, startTime, endTime} = event.args;
    const txHash = event.transaction.hash;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    const logIndex = event.log.logIndex;
    const id = `${txHash}_${logIndex}`;

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;
    const basicHeadline = `Auction started for Noun #${nounId.toString()}`;

    await context.db.insert(auctionEvents).values({
        id,
        type: "created",
        nounId: Number(nounId),
        txHash,
        blockNumber: Number(blockNumber),
        blockTimestamp,
        logIndex,
        startTime: Number(startTime),
        endTime: Number(endTime),
        headline: basicHeadline,
        thumbnailUrl,
        createdAt: BigInt(Math.floor(Date.now() / 1000))
    }).onConflictDoUpdate({
            blockNumber: Number(blockNumber),
            blockTimestamp,
            logIndex,
        }
    ).catch(err => {
        logger.error(`Error inserting auction created event: ${err}`);
    });

    const eventData: EventData = {
        id,
        type: "created",
        nounId: Number(nounId),
        txHash,
        blockNumber: Number(blockNumber),
        blockTimestamp: blockTimestamp.toString(),
        logIndex,
        startTime: Number(startTime),
        endTime: Number(endTime),
        thumbnailUrl,
        createdAt: Math.floor(Date.now() / 1000)
    };

    await addEventEnrichmentJob(eventData);
    logger.debug(`Queued AuctionCreated for Noun #${nounId.toString()}`);
});

ponder.on("NounsAuctionHouse:AuctionBid", async ({event, context}) => {
    const {nounId, sender, value, extended} = event.args;
    const txHash = event.transaction.hash;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    const logIndex = event.log.logIndex;
    const id = `${txHash}_${logIndex}`;

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;
    const displayBidder = `${sender.slice(0, 6)}...${sender.slice(-4)}`;
    const ethValue = formatEther(BigInt(value.toString()));
    const basicHeadline = `Bid placed on Noun #${nounId} for ${ethValue} Ξ by ${displayBidder}`;

    await context.db.insert(auctionEvents).values({
        id,
        type: "bid",
        nounId: Number(nounId),
        txHash,
        blockNumber: Number(blockNumber),
        blockTimestamp,
        logIndex,
        bidder: sender,
        value: value.toString(),
        extended,
        headline: basicHeadline,
        thumbnailUrl,
        createdAt: BigInt(Math.floor(Date.now() / 1000))
    }).onConflictDoUpdate({
        blockNumber: Number(blockNumber),
        blockTimestamp,
        logIndex,
        value: value.toString(),
        extended
    });

    const eventData: EventData = {
        id,
        type: "bid",
        nounId: Number(nounId),
        txHash,
        blockNumber: Number(blockNumber),
        blockTimestamp: blockTimestamp.toString(),
        logIndex,
        bidder: sender,
        value: value.toString(),
        extended,
        thumbnailUrl,
        createdAt: Math.floor(Date.now() / 1000)
    };

    await addEventEnrichmentJob(eventData);
    logger.debug(`Queued AuctionBid for Noun #${nounId.toString()} by ${displayBidder}`);
});

ponder.on("NounsAuctionHouse:AuctionSettled", async ({event, context}) => {
    const {nounId, winner, amount} = event.args;
    const txHash = event.transaction.hash;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    const logIndex = event.log.logIndex;
    const id = `${txHash}_${logIndex}`;

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;
    const displayWinner = `${winner.slice(0, 6)}...${winner.slice(-4)}`;
    const ethAmount = formatEther(BigInt(amount.toString()));
    const basicHeadline = `Noun #${nounId} sold for ${ethAmount} Ξ to ${displayWinner}`;

    await context.db.insert(auctionEvents).values({
        id,
        type: "settled",
        nounId: Number(nounId),
        txHash,
        blockNumber: Number(blockNumber),
        blockTimestamp,
        logIndex,
        winner,
        amount: amount.toString(),
        headline: basicHeadline,
        thumbnailUrl,
        createdAt: BigInt(Math.floor(Date.now() / 1000))
    }).onConflictDoUpdate({
        blockNumber: Number(blockNumber),
        blockTimestamp,
        logIndex,
        amount: amount.toString()
    });

    const eventData: EventData = {
        id,
        type: "settled",
        nounId: Number(nounId),
        txHash,
        blockNumber: Number(blockNumber),
        blockTimestamp: blockTimestamp.toString(),
        logIndex,
        winner,
        amount: amount.toString(),
        thumbnailUrl,
        createdAt: Math.floor(Date.now() / 1000)
    };

    await addEventEnrichmentJob(eventData);
    logger.debug(`Queued AuctionSettled for Noun #${nounId.toString()} to ${displayWinner}`);
});