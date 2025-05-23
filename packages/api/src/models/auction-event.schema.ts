import {z} from 'zod';
import {formatEther} from 'viem';

const formatUsd = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
}).format(amount);

export const AuctionEventBaseSchema = z.object({
    id: z.string(),
    type: z.enum(['created', 'bid', 'settled']),
    nounId: z.number(),
    txHash: z.string(),
    blockNumber: z.number(),
    blockTimestamp: z.string(),
    logIndex: z.number(),
    headline: z.string(),
    thumbnailUrl: z.string().optional().nullable(),
    createdAt: z.string(),
    processedAt: z.number().optional().nullable(),
});

export const AuctionCreatedEventSchemaRaw = AuctionEventBaseSchema.extend({
    type: z.literal('created'),
    startTime: z.number().optional().nullable(),
    endTime: z.number().optional().nullable(),
});

export const AuctionBidEventSchemaRaw = AuctionEventBaseSchema.extend({
    type: z.literal('bid'),
    bidder: z.string().optional().nullable(),
    bidderEns: z.string().optional().nullable(),
    value: z.string().optional().nullable(),
    valueUsd: z.number().optional().nullable(),
    extended: z.boolean().optional().nullable(),
});

export const AuctionSettledEventSchemaRaw = AuctionEventBaseSchema.extend({
    type: z.literal('settled'),
    winner: z.string().optional().nullable(),
    winnerEns: z.string().optional().nullable(),
    amount: z.string().optional().nullable(),
    amountUsd: z.number().optional().nullable(),
});

export const AuctionEventSchemaRaw = z.discriminatedUnion('type', [
    AuctionCreatedEventSchemaRaw,
    AuctionBidEventSchemaRaw,
    AuctionSettledEventSchemaRaw,
]);

export const AuctionEventSchema = AuctionEventSchemaRaw.transform((data) => {
    if (data.type === 'bid' && 'value' in data) {
        return {
            ...data,
            valueEth: data.value ? formatEther(BigInt(data.value)) : null,
            valueDisplay: data.value ? `${formatEther(BigInt(data.value))} Ξ` : null,
            valueUsdDisplay: data.valueUsd ? formatUsd(data.valueUsd) : null,
            valueFullDisplay: data.value && data.valueUsd
                ? `${formatEther(BigInt(data.value))} Ξ (${formatUsd(data.valueUsd)})`
                : data.value
                    ? `${formatEther(BigInt(data.value))} Ξ`
                    : null,
        };
    }

    if (data.type === 'settled' && 'amount' in data) {
        return {
            ...data,
            amountEth: data.amount ? formatEther(BigInt(data.amount)) : null,
            amountDisplay: data.amount ? `${formatEther(BigInt(data.amount))} Ξ` : null,
            amountUsdDisplay: data.amountUsd ? formatUsd(data.amountUsd) : null,
            amountFullDisplay: data.amount && data.amountUsd
                ? `${formatEther(BigInt(data.amount))} Ξ (${formatUsd(data.amountUsd)})`
                : data.amount
                    ? `${formatEther(BigInt(data.amount))} Ξ`
                    : null,
        };
    }
    return data;
});

export const CursorPaginationSchema = z.object({
    limit: z.string().optional().transform(val => val ? Math.min(Math.max(parseInt(val), 1), 100) : 20),
    cursor: z.string().optional(),
    type: z.enum(['created', 'bid', 'settled']).optional(),
    nounId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
    direction: z.enum(['forward', 'backward']).optional().default('forward')
});

export const OffsetPaginationSchema = z.object({
    offset: z.string().optional().transform(val => val ? Math.max(parseInt(val), 0) : 0),
    limit: z.string().optional().transform(val => val ? Math.min(Math.max(parseInt(val), 1), 100) : 10),
    type: z.enum(['created', 'bid', 'settled']).optional(),
    nounId: z.string().optional().transform(val => val ? parseInt(val) : undefined)
});