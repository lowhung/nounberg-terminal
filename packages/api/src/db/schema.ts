import {bigint, boolean, index, integer, numeric, pgTable, text} from "drizzle-orm/pg-core";

export const auctionEvents = pgTable("auction_events", {
    id: text("id").primaryKey(),

    type: text("type").notNull().$type<'created' | 'bid' | 'settled'>(),
    nounId: integer("noun_id").notNull(),
    txHash: text("tx_hash").notNull(),
    blockNumber: integer("block_number").notNull(),
    blockTimestamp: bigint("block_timestamp", {mode: "bigint"}).notNull(),
    logIndex: integer("log_index").notNull(),

    startTime: bigint("start_time", {mode: "bigint"}),
    endTime: bigint("end_time", {mode: "bigint"}),

    bidder: text("bidder"),
    bidderEns: text("bidder_ens"),
    valueWei: text("value_wei"),
    valueUsd: numeric("value_usd", {precision: 12, scale: 2}),
    extended: boolean("extended"),

    winner: text("winner"),
    winnerEns: text("winner_ens"),
    amountWei: text("amount_wei"),
    amountUsd: numeric("amount_usd", {precision: 12, scale: 2}),

    headline: text("headline").notNull(),
    thumbnailUrl: text("thumbnail_url"),

    createdAt: bigint("created_at", {mode: "bigint"}).notNull(),
    processedAt: bigint("processed_at", {mode: "bigint"}),
}, (table) => [
    index("block_timestamp_idx").on(table.blockTimestamp),

    index("type_idx").on(table.type),
    index("noun_id_idx").on(table.nounId),

    index("type_block_timestamp_idx").on(table.type, table.blockTimestamp),
    index("noun_id_block_timestamp_idx").on(table.nounId, table.blockTimestamp),

    index("type_noun_id_block_timestamp_idx").on(table.type, table.nounId, table.blockTimestamp),
]);
