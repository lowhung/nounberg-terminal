import {z} from 'zod';

export const AuctionEventBaseSchema = z.object({
    id: z.string(),
    type: z.enum(['created', 'bid', 'settled']),
    nounId: z.number(),
    txHash: z.string(),
    blockNumber: z.number(),
    blockTimestamp: z.number(),
    logIndex: z.number(),
    headline: z.string(),
    thumbnailUrl: z.string().optional().nullable(),
    createdAt: z.number(),
    processedAt: z.number().optional().nullable(),
});

export const AuctionCreatedEventSchema = AuctionEventBaseSchema.extend({
    type: z.literal('created'),
    startTime: z.number().optional().nullable(),
    endTime: z.number().optional().nullable(),
});

export const AuctionBidEventSchema = AuctionEventBaseSchema.extend({
    type: z.literal('bid'),
    bidder: z.string(),
    bidderEns: z.string().optional().nullable(),
    value: z.string(),
    valueUsd: z.number().optional().nullable(),
    extended: z.boolean().optional().nullable(),
});

export const AuctionSettledEventSchema = AuctionEventBaseSchema.extend({
    type: z.literal('settled'),
    winner: z.string(),
    winnerEns: z.string().optional().nullable(),
    amount: z.string(),
    amountUsd: z.number().optional().nullable(),
});

export const AuctionEventSchema = z.discriminatedUnion('type', [
    AuctionCreatedEventSchema,
    AuctionBidEventSchema,
    AuctionSettledEventSchema,
]);

export const PaginatedEventsSchema = z.object({
    data: z.array(AuctionEventSchema),
    nextCursor: z.string().optional().nullable(),
    count: z.number(),
});
