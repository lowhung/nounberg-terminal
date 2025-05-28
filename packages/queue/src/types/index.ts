export type AuctionEventType = 'created' | 'bid' | 'settled';

export interface EventData {
    id: string;
    type: AuctionEventType;
    nounId: number;
    txHash: string;
    blockNumber: number;
    blockTimestamp: string;
    logIndex: number;
    createdAt: number;
    thumbnailUrl?: string;

    startTime?: number;
    endTime?: number;

    bidder?: string;
    value?: string;
    extended?: boolean;

    winner?: string;
    amount?: string;

    headline: string;
}

export type JobType = 'enrich_event';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
    id: number;
    event_id: string;
    type: JobType;
    status: JobStatus;
    attempts: number;
    data: any;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface BullMQJobData extends EventData {
}

export interface BullMQJobResult {
    success: boolean;
    eventId: string;
}
