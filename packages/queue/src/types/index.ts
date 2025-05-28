export type AuctionEventType = 'created' | 'bid' | 'settled';

export interface EventData {
    id: string;
    type: AuctionEventType;
    nounId: number;
    txHash: string;
    blockNumber: number;
    blockTimestamp: string;
    logIndex: number;
    createdAt: string;
    thumbnailUrl?: string;

    startTime?: string;
    endTime?: string;

    bidder?: string;
    valueWei?: string;
    extended?: boolean;

    winner?: string;
    amountWei?: string;

    headline: string;
}

export interface JobResult {
    success: boolean;
    eventId: string;
}
