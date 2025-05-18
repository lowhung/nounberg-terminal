import { ponder } from "ponder:registry";
import { addEventEnrichmentJob } from "./lib/queue"; 
import { EventData } from "./types";

ponder.on("NounsAuctionHouse:AuctionCreated", async ({ event, context }) => {
    const { nounId, startTime, endTime } = event.args;
    const txHash = event.transaction.hash;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    const logIndex = event.log.logIndex;
    const id = txHash;

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;

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

    console.log(`Queued AuctionCreated for Noun #${nounId.toString()}`);
});

ponder.on("NounsAuctionHouse:AuctionBid", async ({ event, context }) => {
    const { nounId, sender, value, extended } = event.args;
    const txHash = event.transaction.hash;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    const logIndex = event.log.logIndex;
    const id = txHash;

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;

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

    console.log(`Queued AuctionBid for Noun #${nounId.toString()} by ${sender.slice(0, 6)}...${sender.slice(-4)}`);
});

ponder.on("NounsAuctionHouse:AuctionSettled", async ({ event, context }) => {
    const { nounId, winner, amount } = event.args;
    const txHash = event.transaction.hash;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    const logIndex = event.log.logIndex;
    const id = txHash;

    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;

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

    console.log(`Queued AuctionSettled for Noun #${nounId.toString()} to ${winner.slice(0, 6)}...${winner.slice(-4)}`);
});