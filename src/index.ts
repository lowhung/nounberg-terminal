import {ponder, Event, Context} from "ponder:registry";
import {auctionEvents} from "ponder:schema";
import {formatEther} from "viem";

async function processAuctionEvent(event: Event, type: string) {
    const txHash = event.transaction.hash;
    const blockNumber = event.block.number;
    const blockTimestamp = event.block.timestamp;
    const logIndex = event.log.logIndex;

    const id = `${txHash}_${logIndex}`;

    return {
        id,
        txHash,
        blockNumber: Number(blockNumber),
        blockTimestamp: blockTimestamp,
        logIndex,
        type,
        createdAt: Math.floor(Date.now() / 1000),
    };
}

// Worker responsibilities:
// Convert ETH amounts to USD using a public price API.
// Resolve ENS names for all addresses involved.
// Fetch or compose a thumbnail URL for the Noun.
// Create a human-readable headline that clearly summarizes the auction event (e.g. Noun #721 sold for 69.42 Ξ ($248 000) to vitalik.eth).
// Assemble the all auction data and persist it in the database.

// Store data in the database of your choice
// Store, at minimum:
// Block & transaction metadata
// Event type (AuctionCreated, AuctionBid, AuctionSettled)
// Noun ID, price in ETH and USD, winner / bidder addresses & ENS
// Thumbnail URL
// Human-readable headline
// Timestamps
// Ensure inserts are idempotent so chain re‑organisations or restarts never create duplicates.

ponder.on("NounsAuctionHouse:AuctionCreated", async ({event, context}) => {
    const {nounId, startTime, endTime} = event.args;
    const eventData = await processAuctionEvent(event, "created");
    const thumbnailUrl = `https://noun.pics/${nounId.toString()}`;
    const headline = `Auction started for Noun #${nounId.toString()}`;

    // TODO: Expand on fields and remove destructuring
    await context.db.insert(auctionEvents).values({
        ...eventData,
        nounId: Number(nounId),
        startTime: Number(startTime),
        endTime: Number(endTime),
        headline,
        thumbnailUrl,
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

    // TODO: Expand on fields and remove destructuring
    await context.db.insert(auctionEvents).values({
        ...eventData,
        nounId: Number(nounId),
        bidder: sender.toLowerCase(),
        value: value.toString(),
        extended,
        headline,
        thumbnailUrl,
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

    // TODO: Expand on fields and remove destructuring
    await context.db.insert(auctionEvents).values({
        ...eventData,
        nounId: Number(nounId),
        winner: winner.toLowerCase(),
        amount: amount.toString(),
        headline,
        thumbnailUrl,
    });
    console.log(`Indexed AuctionSettled for Noun #${nounId.toString()} to ${winnerDisplay}`);
});
