import {onchainTable} from "ponder";

export const auctionEvents = onchainTable("auction_events",
    (t) => ({
        id: t.text().primaryKey(),

        type: t.text().notNull(),
        nounId: t.integer().notNull(),
        txHash: t.hex().notNull(),
        blockNumber: t.integer().notNull(),
        blockTimestamp: t.bigint().notNull(),
        logIndex: t.integer().notNull(),

        startTime: t.integer(),
        endTime: t.integer(),

        bidder: t.hex(),
        bidderEns: t.text(),
        value: t.numeric(),
        valueUsd: t.numeric(),
        extended: t.boolean(),

        winner: t.hex(),
        winnerEns: t.text(),
        amount: t.numeric(),
        amountUsd: t.numeric(),

        headline: t.text().notNull(),
        thumbnailUrl: t.text(),

        createdAt: t.bigint().notNull(),
        processedAt: t.integer(),
    }), (table) => ({
        // TODO: add indexes for pagination
    }));