import type { Common } from '../internal/common.js';
import type { Factory, LightBlock, Network, Source, SyncBlock, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt } from '../internal/types.js';
import { type SyncProgress } from '../sync/index.js';
import type { Queue } from '../utils/queue.js';
import type { RequestQueue } from '../utils/requestQueue.js';
import { type Address } from "viem";
export type RealtimeSync = {
    start(args: {
        syncProgress: Pick<SyncProgress, "finalized">;
        initialChildAddresses: Map<Factory, Map<Address, number>>;
    }): Promise<Queue<void, BlockWithEventData>>;
    unfinalizedBlocks: LightBlock[];
    childAddresses: Map<Factory, Map<Address, number>>;
    kill: () => void;
};
type CreateRealtimeSyncParameters = {
    common: Common;
    network: Network;
    requestQueue: RequestQueue;
    sources: Source[];
    onEvent: (event: RealtimeSyncEvent) => Promise<void>;
    onFatalError: (error: Error) => void;
};
export type BlockWithEventData = {
    block: SyncBlock;
    transactions: SyncTransaction[];
    transactionReceipts: SyncTransactionReceipt[];
    logs: SyncLog[];
    traces: SyncTrace[];
    childAddresses: Map<Factory, Set<Address>>;
};
export type RealtimeSyncEvent = ({
    type: "block";
    hasMatchedFilter: boolean;
    endClock?: () => number;
} & BlockWithEventData) | {
    type: "finalize";
    block: LightBlock;
} | {
    type: "reorg";
    block: LightBlock;
    reorgedBlocks: LightBlock[];
};
export declare const createRealtimeSync: (args: CreateRealtimeSyncParameters) => RealtimeSync;
export {};
//# sourceMappingURL=index.d.ts.map