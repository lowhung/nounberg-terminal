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

export interface BaseDbRecord {
    id: string;
    type: AuctionEventType;
    nounId: number;
    txHash: string;
    blockNumber: number;
    blockTimestamp: bigint;
    logIndex: number;
    headline: string;
    thumbnailUrl: string;
    createdAt: bigint;
}

export interface AuctionCreatedDbRecord extends BaseDbRecord {
    type: "created";
    startTime: bigint;
    endTime: bigint;
    bidder?: never;
    valueWei?: never;
    extended?: never;
    winner?: never;
    amountWei?: never;
}

export interface AuctionBidDbRecord extends BaseDbRecord {
    type: "bid";
    bidder: string;
    valueWei: string;
    extended: boolean;
    startTime?: never;
    endTime?: never;
    winner?: never;
    amountWei?: never;
}

export interface AuctionSettledDbRecord extends BaseDbRecord {
    type: "settled";
    winner: string;
    amountWei: string;
    startTime?: never;
    endTime?: never;
    bidder?: never;
    valueWei?: never;
    extended?: never;
}

export type AuctionEventDbRecord = AuctionCreatedDbRecord | AuctionBidDbRecord | AuctionSettledDbRecord;

export interface BaseEventArgs {
    id: string;
    txHash: string;
    blockNumber: number;
    blockTimestamp: bigint;
    logIndex: number;
}

export interface AuctionCreatedData extends BaseEventArgs {
    nounId: bigint;
    startTime: bigint;
    endTime: bigint;
}

export interface AuctionBidData extends BaseEventArgs {
    nounId: bigint;
    sender: string;
    value: bigint;
    extended: boolean;
}

export interface AuctionSettledData extends BaseEventArgs {
    nounId: bigint;
    winner: string;
    amount: bigint;
}