import { ponder } from "ponder:registry";
import {EventHandlerService} from "./event-hander";

if (!process.env.QUEUE_API_URL) {
    console.warn("QUEUE_API_URL is not set. No events will be queued.");
}

ponder.on("NounsAuctionHouse:AuctionCreated", async ({ event, context }) => {
    await EventHandlerService.handleAuctionCreated({
        id: event.id,
        nounId: event.args.nounId,
        startTime: event.args.startTime,
        endTime: event.args.endTime,
        txHash: event.transaction.hash,
        blockNumber: Number(event.block.number),
        blockTimestamp: event.block.timestamp,
        logIndex: event.log.logIndex
    }, context);
});

ponder.on("NounsAuctionHouse:AuctionBid", async ({ event, context }) => {
    await EventHandlerService.handleAuctionBid({
        id: event.id,
        nounId: event.args.nounId,
        sender: event.args.sender,
        value: event.args.value,
        extended: event.args.extended,
        txHash: event.transaction.hash,
        blockNumber: Number(event.block.number),
        blockTimestamp: event.block.timestamp,
        logIndex: event.log.logIndex
    }, context);
});

ponder.on("NounsAuctionHouse:AuctionSettled", async ({ event, context }) => {
    await EventHandlerService.handleAuctionSettled({
        id: event.id,
        nounId: event.args.nounId,
        winner: event.args.winner,
        amount: event.args.amount,
        txHash: event.transaction.hash,
        blockNumber: Number(event.block.number),
        blockTimestamp: event.block.timestamp,
        logIndex: event.log.logIndex
    }, context);
});