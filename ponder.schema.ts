import { onchainTable } from "ponder";

// Define our auction events schema
export const auctionEvents = onchainTable("auctionEvents", (t) => ({
  // Primary key - unique ID for this event
  id: t.text().primaryKey(),
  
  // Event information
  type: t.text().notNull(), // 'created', 'bid', or 'settled'
  nounId: t.integer().notNull(),
  txHash: t.text().notNull(),
  blockNumber: t.integer().notNull(),
  blockTimestamp: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  
  // Auction Created fields
  startTime: t.integer(),
  endTime: t.integer(),
  
  // Bid fields
  bidder: t.text(), // Address of the bidder
  bidderEns: t.text(), // ENS of the bidder if available
  value: t.numeric(), // ETH value in wei
  valueUsd: t.numeric(), // USD value at time of bid
  extended: t.boolean(), // Whether the auction was extended
  
  // Settled fields
  winner: t.text(), // Address of the winner
  winnerEns: t.text(), // ENS of the winner if available
  amount: t.numeric(), // Final ETH value in wei
  amountUsd: t.numeric(), // Final USD value

  // Common fields for all events
  headline: t.text().notNull(), // Human-readable summary
  thumbnailUrl: t.text(), // URL for the Noun's image
  
  // Processing metadata
  createdAt: t.integer().notNull(), // When this record was created
  processedAt: t.integer(), // When this record was fully processed
}));
