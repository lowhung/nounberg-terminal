import {z} from 'zod';

export const AuctionEventSchema = z.object({
    id: z.string(),
    type: z.enum(['created', 'bid', 'settled']),
    nounId: z.number(),
    txHash: z.string(),
    blockNumber: z.number(),
    blockTimestamp: z.bigint().transform((val) => String(val)),
    logIndex: z.number(),
    headline: z.string(),
    thumbnailUrl: z.string().optional().nullable(),
    createdAt: z.bigint().transform((val) => String(val)),
    processedAt: z.number().optional().nullable(),
    
    // Auction creation fields
    startTime: z.number().optional().nullable(),
    endTime: z.number().optional().nullable(),
    
    // Bid fields
    bidder: z.string().optional().nullable(),
    bidderEns: z.string().optional().nullable(),
    valueWei: z.string().optional().nullable(),
    valueUsd: z.string().optional().nullable(),
    extended: z.boolean().optional().nullable(),
    
    // Settlement fields
    winner: z.string().optional().nullable(),
    winnerEns: z.string().optional().nullable(),
    amountWei: z.string().optional().nullable(),
    amountUsd: z.string().optional().nullable(),
});

export const EventsQuerySchema = z.object({
    limit: z.string().optional().transform(val =>
        val ? Math.min(Math.max(parseInt(val), 1), 100) : 20
    ),
    cursor: z.string().optional().transform((val) => {
        if (val) {
            return BigInt(val)
        }
    }),
    type: z.enum(['created', 'bid', 'settled']).optional(),
    nounId: z.string().optional().transform(val =>
        val ? parseInt(val) : undefined
    )
});