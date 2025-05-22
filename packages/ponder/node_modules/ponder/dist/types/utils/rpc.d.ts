import type { SyncBlock, SyncLog, SyncTrace, SyncTransactionReceipt } from '../internal/types.js';
import type { RequestQueue } from './requestQueue.js';
import { type Address, type Hash, type Hex, type LogTopic } from "viem";
/**
 * Helper function for "eth_getBlockByNumber" request.
 */
export declare const _eth_getBlockByNumber: (requestQueue: RequestQueue, { blockNumber, blockTag, }: {
    blockNumber: Hex | number;
    blockTag?: undefined;
} | {
    blockNumber?: undefined;
    blockTag: "latest";
}) => Promise<SyncBlock>;
/**
 * Helper function for "eth_getBlockByNumber" request.
 */
export declare const _eth_getBlockByHash: (requestQueue: RequestQueue, { hash }: {
    hash: Hex;
}) => Promise<SyncBlock>;
/**
 * Helper function for "eth_getLogs" rpc request.
 * Handles different error types and retries the request if applicable.
 */
export declare const _eth_getLogs: (requestQueue: RequestQueue, params: {
    address?: Address | Address[];
    topics?: LogTopic[];
} & ({
    fromBlock: Hex | number;
    toBlock: Hex | number;
} | {
    blockHash: Hash;
})) => Promise<SyncLog[]>;
/**
 * Helper function for "eth_getTransactionReceipt" request.
 */
export declare const _eth_getTransactionReceipt: (requestQueue: RequestQueue, { hash }: {
    hash: Hex;
}) => Promise<SyncTransactionReceipt>;
/**
 * Helper function for "eth_getBlockReceipts" request.
 */
export declare const _eth_getBlockReceipts: (requestQueue: RequestQueue, { blockHash }: {
    blockHash: Hash;
}) => Promise<SyncTransactionReceipt[]>;
/**
 * Helper function for "debug_traceBlockByNumber" request.
 */
export declare const _debug_traceBlockByNumber: (requestQueue: RequestQueue, { blockNumber, }: {
    blockNumber: Hex | number;
}) => Promise<SyncTrace[]>;
/**
 * Helper function for "debug_traceBlockByHash" request.
 */
export declare const _debug_traceBlockByHash: (requestQueue: RequestQueue, { hash, }: {
    hash: Hash;
}) => Promise<SyncTrace[]>;
//# sourceMappingURL=rpc.d.ts.map