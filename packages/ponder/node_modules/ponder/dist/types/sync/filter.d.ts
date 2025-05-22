import type { BlockFilter, Factory, Filter, InternalBlock, InternalLog, InternalTrace, InternalTransaction, LogFactory, LogFilter, SyncBlock, SyncLog, SyncTrace, SyncTransaction, TraceFilter, TransactionFilter, TransferFilter } from '../internal/types.js';
import type { TransactionReceipt } from '../types/eth.js';
import type { Address } from "viem";
/** Returns true if `address` is an address filter. */
export declare const isAddressFactory: (address: Address | Address[] | Factory | undefined | null) => address is LogFactory;
export declare const getChildAddress: ({ log, factory, }: {
    log: SyncLog;
    factory: Factory;
}) => Address;
export declare const isAddressMatched: ({ address, blockNumber, childAddresses, }: {
    address: Address | undefined;
    blockNumber: number;
    childAddresses: Map<Address, number>;
}) => boolean;
/**
 * Returns `true` if `log` matches `filter`
 */
export declare const isLogFactoryMatched: ({ factory, log, }: {
    factory: LogFactory;
    log: InternalLog | SyncLog;
}) => boolean;
/**
 * Returns `true` if `log` matches `filter`
 */
export declare const isLogFilterMatched: ({ filter, log, }: {
    filter: LogFilter;
    log: InternalLog | SyncLog;
}) => boolean;
/**
 * Returns `true` if `transaction` matches `filter`
 */
export declare const isTransactionFilterMatched: ({ filter, transaction, }: {
    filter: TransactionFilter;
    transaction: InternalTransaction | SyncTransaction;
}) => boolean;
/**
 * Returns `true` if `trace` matches `filter`
 */
export declare const isTraceFilterMatched: ({ filter, trace, block, }: {
    filter: TraceFilter;
    trace: InternalTrace | SyncTrace["trace"];
    block: Pick<InternalBlock | SyncBlock, "number">;
}) => boolean;
/**
 * Returns `true` if `trace` matches `filter`
 */
export declare const isTransferFilterMatched: ({ filter, trace, block, }: {
    filter: TransferFilter;
    trace: InternalTrace | SyncTrace["trace"];
    block: Pick<InternalBlock | SyncBlock, "number">;
}) => boolean;
/**
 * Returns `true` if `block` matches `filter`
 */
export declare const isBlockFilterMatched: ({ filter, block, }: {
    filter: BlockFilter;
    block: InternalBlock | SyncBlock;
}) => boolean;
export declare const defaultBlockFilterInclude: Exclude<BlockFilter["include"], undefined>;
export declare const defaultTransactionReceiptInclude: `transactionReceipt.${keyof TransactionReceipt}`[];
export declare const defaultLogFilterInclude: Exclude<LogFilter["include"], undefined>;
export declare const defaultTransactionFilterInclude: Exclude<TransactionFilter["include"], undefined>;
export declare const defaultTraceFilterInclude: Exclude<TraceFilter["include"], undefined>;
export declare const defaultTransferFilterInclude: Exclude<TransferFilter["include"], undefined>;
export declare const shouldGetTransactionReceipt: (filter: Pick<Filter, "include" | "type">) => boolean;
//# sourceMappingURL=filter.d.ts.map