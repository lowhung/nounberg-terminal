import type { Common } from '../internal/common.js';
import type { Event, Filter, IndexingBuild, LightBlock, Network, RawEvent, Seconds, Source, Status, SyncBlock } from '../internal/types.js';
import { type HistoricalSync } from '../sync-historical/index.js';
import { type RealtimeSyncEvent } from '../sync-realtime/index.js';
import type { SyncStore } from '../sync-store/index.js';
import { type Checkpoint } from '../utils/checkpoint.js';
import type { RequestQueue } from '../utils/requestQueue.js';
export type Sync = {
    getEvents(): AsyncGenerator<Event[]>;
    startRealtime(): Promise<void>;
    getStatus(): Status;
    seconds: Seconds;
    getFinalizedCheckpoint(): string;
};
export type RealtimeEvent = {
    type: "block";
    checkpoint: string;
    status: Status;
    events: Event[];
    network: Network;
} | {
    type: "reorg";
    checkpoint: string;
    network: Network;
} | {
    type: "finalize";
    checkpoint: string;
    network: Network;
};
export type SyncProgress = {
    start: SyncBlock | LightBlock;
    end: SyncBlock | LightBlock | undefined;
    current: SyncBlock | LightBlock | undefined;
    finalized: SyncBlock | LightBlock;
};
export declare const syncBlockToLightBlock: ({ hash, parentHash, number, timestamp, }: SyncBlock) => LightBlock;
/** Convert `block` to a `Checkpoint`. */
export declare const blockToCheckpoint: (block: LightBlock | SyncBlock, chainId: number, rounding: "up" | "down") => Checkpoint;
export declare const splitEvents: (events: Event[]) => {
    checkpoint: string;
    events: Event[];
}[];
/** Returns the checkpoint for a given block tag. */
export declare const getChainCheckpoint: ({ syncProgress, network, tag, }: {
    syncProgress: SyncProgress;
    network: Network;
    tag: "start" | "current" | "finalized" | "end";
}) => string | undefined;
export declare const createSync: (params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "sources" | "networks">;
    requestQueues: RequestQueue[];
    syncStore: SyncStore;
    onRealtimeEvent(event: RealtimeEvent): Promise<void>;
    onFatalError(error: Error): void;
    crashRecoveryCheckpoint: string;
    ordering: "omnichain" | "multichain";
}) => Promise<Sync>;
export declare const getPerChainOnRealtimeSyncEvent: ({ common, network, sources, syncStore, syncProgress, }: {
    common: Common;
    network: Network;
    sources: Source[];
    syncStore: SyncStore;
    syncProgress: SyncProgress;
}) => (event: RealtimeSyncEvent) => Promise<RealtimeSyncEvent>;
export declare function getLocalEventGenerator(params: {
    common: Common;
    network: Network;
    syncStore: SyncStore;
    sources: Source[];
    localSyncGenerator: AsyncGenerator<number>;
    from: string;
    to: string;
    limit: number;
}): AsyncGenerator<{
    events: RawEvent[];
    checkpoint: string;
}>;
export declare function getLocalSyncGenerator({ common, network, syncProgress, historicalSync, }: {
    common: Common;
    network: Network;
    syncProgress: SyncProgress;
    historicalSync: HistoricalSync;
}): AsyncGenerator<number>;
export declare const getLocalSyncProgress: ({ common, sources, network, requestQueue, intervalsCache, }: {
    common: Common;
    sources: Source[];
    network: Network;
    requestQueue: RequestQueue;
    intervalsCache: HistoricalSync["intervalsCache"];
}) => Promise<SyncProgress>;
/** Returns the closest-to-tip block that has been synced for all `sources`. */
export declare const getCachedBlock: ({ filters, intervalsCache, }: {
    filters: Filter[];
    intervalsCache: HistoricalSync["intervalsCache"];
}) => number | undefined;
/**
 * Merges multiple event generators into a single generator while preserving
 * the order of events.
 *
 * @param generators - Generators to merge.
 * @returns A single generator that yields events from all generators.
 */
export declare function mergeAsyncGeneratorsWithEventOrder(generators: AsyncGenerator<{
    events: Event[];
    checkpoint: string;
}>[]): AsyncGenerator<{
    events: Event[];
    checkpoint: string;
}>;
//# sourceMappingURL=index.d.ts.map