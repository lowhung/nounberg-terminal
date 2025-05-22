import type { Common } from '../internal/common.js';
import type { Event, Factory, InternalBlock, InternalLog, InternalTrace, InternalTransaction, InternalTransactionReceipt, RawEvent, Source, SyncBlock, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt } from '../internal/types.js';
import type { AbiEvent } from "abitype";
import { type Address, type Hex } from "viem";
/**
 * Create `RawEvent`s from raw data types
 */
export declare const buildEvents: ({ sources, blockData: { block, logs, transactions, transactionReceipts, traces }, childAddresses, chainId, }: {
    sources: Source[];
    blockData: {
        block: InternalBlock;
        logs: InternalLog[];
        transactions: InternalTransaction[];
        transactionReceipts: InternalTransactionReceipt[];
        traces: InternalTrace[];
    };
    childAddresses: Map<Factory, Map<Address, number>>;
    chainId: number;
}) => RawEvent[];
export declare const decodeEvents: (common: Common, sources: Source[], rawEvents: RawEvent[]) => Event[];
/** @see https://github.com/wevm/viem/blob/main/src/utils/abi/decodeEventLog.ts#L99 */
export declare function decodeEventLog({ abiItem, topics, data, }: {
    abiItem: AbiEvent;
    topics: [signature: Hex, ...args: Hex[]] | [];
    data: Hex;
}): any;
export declare const syncBlockToInternal: ({ block, }: {
    block: SyncBlock;
}) => InternalBlock;
export declare const syncLogToInternal: ({ log }: {
    log: SyncLog;
}) => InternalLog;
export declare const syncTransactionToInternal: ({ transaction, }: {
    transaction: SyncTransaction;
}) => InternalTransaction;
export declare const syncTransactionReceiptToInternal: ({ transactionReceipt, }: {
    transactionReceipt: SyncTransactionReceipt;
}) => InternalTransactionReceipt;
export declare const syncTraceToInternal: ({ trace, block, transaction, }: {
    trace: SyncTrace;
    block: Pick<SyncBlock, "number">;
    transaction: Pick<SyncTransaction, "transactionIndex">;
}) => InternalTrace;
//# sourceMappingURL=events.d.ts.map