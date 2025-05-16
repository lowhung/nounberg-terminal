export type AuctionEventType = 'created' | 'bid' | 'settled';

export interface AuctionEvent {
    id: string;
    txHash: string;
    blockNumber: number;
    blockTimestamp: number;
    logIndex: number;
    type: AuctionEventType;
    nounId: number;
    headline: string;
    thumbnailUrl: string;
    createdAt: number;
    processedAt?: number;
}


export type JobType = 'enrich_event';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
    id: number;
    eventId: string;
    type: JobType;
    status: JobStatus;
    attempts: number;
    data: any;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}
