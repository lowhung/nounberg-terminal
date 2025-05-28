import {bigint, boolean, integer, numeric, pgTable, text} from "drizzle-orm/pg-core";

export const auctionEvents = pgTable("auction_events", {
    id: text("id").primaryKey(),

    type: text("type").notNull().$type<'created' | 'bid' | 'settled'>(),
    nounId: integer("noun_id").notNull(),
    txHash: text("tx_hash").notNull(),
    blockNumber: integer("block_number").notNull(),
    blockTimestamp: bigint("block_timestamp", {mode: "bigint"}).notNull(),
    logIndex: integer("log_index").notNull(),

    startTime: integer("start_time"),
    endTime: integer("end_time"),

    bidder: text("bidder"),
    bidderEns: text("bidder_ens"),
    valueWei: numeric("value_wei"),
    valueUsd: numeric("value_usd", {precision: 12, scale: 2}),
    extended: boolean("extended"),

    winner: text("winner"),
    winnerEns: text("winner_ens"),
    amountWei: numeric("amount_wei"),
    amountUsd: numeric("amount_usd", {precision: 12, scale: 2}),

    headline: text("headline").notNull(),
    thumbnailUrl: text("thumbnail_url"),

    createdAt: bigint("created_at", {mode: "bigint"}).notNull(),
    processedAt: integer("processed_at"),
});