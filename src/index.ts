import {ponder} from "ponder:registry";
import {auctionEvents} from "ponder:schema";
import {formatEther} from "viem";
import {createDbContext} from "./lib/db";
import {createJob} from "./lib/queue";

const db = createDbContext();
const pgPool = db.getPool();

async function processAuctionEvent(event: any, type: string) {
    const txHash = event.transaction.hash;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    const logIndex = event.log.logIndex;

    const id = txHash;

    return {
        id,
        txHash,
        blockNumber: Number(blockNumber),
        blockTimestamp,
        logIndex,
        type,
        createdAt: Math.floor(Date.now() / 1000),
    };
}

ponder.on("NounsAuctionHouse:AuctionCreated", async ({event, context}) => {
    const {nounId, startTime, endTime} = event.args;

    const eventData = await processAuctionEvent(event, "created");

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;

    const headline = `Auction started for Noun #${nounId.toString()}`;

    await context.db.insert(auctionEvents).values({
        ...eventData,
        nounId: Number(nounId),
        startTime: Number(startTime),
        endTime: Number(endTime),
        headline,
        thumbnailUrl,
    });

    await createJob(pgPool, eventData.id, 'enrich_event', {
        blockTimestamp: eventData.blockTimestamp
    });

    console.log(`Indexed AuctionCreated for Noun #${nounId.toString()}`);
});

ponder.on("NounsAuctionHouse:AuctionBid", async ({event, context}) => {
    const {nounId, sender, value, extended} = event.args;

    const eventData = await processAuctionEvent(event, "bid");

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;

    const ethAmount = formatEther(value);

    const bidderDisplay = `${sender.slice(0, 6)}...${sender.slice(-4)}`;

    const headline = `Bid placed on Noun #${nounId.toString()} for ${ethAmount} Ξ by ${bidderDisplay}`;

    await context.db.insert(auctionEvents).values({
        ...eventData,
        nounId: Number(nounId),
        bidder: sender,
        value: value.toString(),
        extended,
        headline,
        thumbnailUrl,
    });

    await createJob(pgPool, eventData.id, 'enrich_event', {
        blockTimestamp: eventData.blockTimestamp,
        address: sender.toLowerCase(),
        value: value.toString()
    });

    console.log(`Indexed AuctionBid for Noun #${nounId.toString()} by ${bidderDisplay}`);
});

ponder.on("NounsAuctionHouse:AuctionSettled", async ({event, context}) => {
    const {nounId, winner, amount} = event.args;

    const eventData = await processAuctionEvent(event, "settled");

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;

    const ethAmount = formatEther(amount);

    const winnerDisplay = `${winner.slice(0, 6)}...${winner.slice(-4)}`;

    const headline = `Noun #${nounId.toString()} sold for ${ethAmount} Ξ to ${winnerDisplay}`;

    await context.db.insert(auctionEvents).values({
        ...eventData,
        nounId: Number(nounId),
        winner: winner,
        amount: amount.toString(),
        headline,
        thumbnailUrl,
    });

    await createJob(pgPool, eventData.id, 'enrich_event', {
        blockTimestamp: eventData.blockTimestamp,
        address: winner,
        amount: amount.toString()
    });

    console.log(`Indexed AuctionSettled for Noun #${nounId.toString()} to ${winnerDisplay}`);
});

process.on('SIGINT', async () => {
    console.log('Shutting down Ponder indexer...');
    try {
        await db.close();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
});

process.on('SIGTERM', async () => {
    console.log('Shutting down Ponder indexer...');
    try {
        await db.close();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
});