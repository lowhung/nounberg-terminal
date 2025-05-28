import {onchainTable, index} from "ponder";

export const auctionEvents = onchainTable(
    "auction_events",
    (t) => ({
        id: t.text().primaryKey(),

        type: t.text().notNull(),
        nounId: t.integer().notNull(),
        txHash: t.hex().notNull(),
        blockNumber: t.integer().notNull(),
        blockTimestamp: t.bigint().notNull(),
        logIndex: t.integer().notNull(),

        startTime: t.bigint(),
        endTime: t.bigint(),

        bidder: t.hex(),
        bidderEns: t.text(),
        valueWei: t.text(),
        valueUsd: t.numeric(),
        extended: t.boolean(),

        winner: t.hex(),
        winnerEns: t.text(),
        amountWei: t.text(),
        amountUsd: t.numeric(),

        headline: t.text().notNull(),
        thumbnailUrl: t.text(),

        createdAt: t.bigint().notNull(),
        processedAt: t.bigint(),
    }),
    (table) => ({
        blockTimestampIdx: index().on(table.blockTimestamp),

        typeIdx: index().on(table.type),
        nounIdIdx: index().on(table.nounId),

        typeBlockTimestampIdx: index().on(table.type, table.blockTimestamp),
        nounIdBlockTimestampIdx: index().on(table.nounId, table.blockTimestamp),

        typeNounIdBlockTimestampIdx: index().on(table.type, table.nounId, table.blockTimestamp),
    })
);