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
    thumbnailUrl: z.string().optional(),
    createdAt: z.number(),
    processedAt: z.number().optional(),
});

export const AuctionCreatedEventSchema = AuctionEventBaseSchema.extend({
    type: z.literal('created'),
    startTime: z.number(),
    endTime: z.number(),
});

export const AuctionBidEventSchema = AuctionEventBaseSchema.extend({
    type: z.literal('bid'),
    bidder: z.string(),
    bidderEns: z.string().optional(),
    value: z.string(),
    valueUsd: z.number().optional(),
    extended: z.boolean().optional(),
});

export const AuctionSettledEventSchema = AuctionEventBaseSchema.extend({
    type: z.literal('settled'),
    winner: z.string(),
    winnerEns: z.string().optional(),
    amount: z.string(),
    amountUsd: z.number().optional(),
});

export const AuctionEventSchema = z.discriminatedUnion('type', [
    AuctionCreatedEventSchema,
    AuctionBidEventSchema,
    AuctionSettledEventSchema,
]);

export const PaginatedEventsSchema = z.object({
    events: z.array(AuctionEventSchema),
    nextCursor: z.string().optional().nullable(),
    count: z.number(),
});

export type AuctionEvent = z.infer<typeof AuctionEventSchema>;
export type AuctionCreatedEvent = z.infer<typeof AuctionCreatedEventSchema>;
export type AuctionBidEvent = z.infer<typeof AuctionBidEventSchema>;
export type AuctionSettledEvent = z.infer<typeof AuctionSettledEventSchema>;
export type PaginatedEvents = z.infer<typeof PaginatedEventsSchema>;

export const ErrorResponseSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
    }),
});

export const HealthCheckSchema = z.object({
    status: z.enum(['ok', 'error']),
    version: z.string(),
    uptime: z.number(),
    message: z.string().optional(),
});

export const WebSocketMessageSchema = z.object({
    type: z.string(),
    data: z.any().optional(),
    message: z.string().optional(),
    timestamp: z.string().optional(),
});

