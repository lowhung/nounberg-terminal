import { toLowerCase } from '../utils/lowercase.js';
/** Returns true if `address` is an address filter. */
export const isAddressFactory = (address) => {
    if (address === undefined || address === null || typeof address === "string")
        return false;
    return Array.isArray(address) ? isAddressFactory(address[0]) : true;
};
export const getChildAddress = ({ log, factory, }) => {
    if (factory.childAddressLocation.startsWith("offset")) {
        const childAddressOffset = Number(factory.childAddressLocation.substring(6));
        const start = 2 + 12 * 2 + childAddressOffset * 2;
        const length = 20 * 2;
        return `0x${log.data.substring(start, start + length)}`;
    }
    else {
        const start = 2 + 12 * 2;
        const length = 20 * 2;
        const topicIndex = factory.childAddressLocation === "topic1"
            ? 1
            : factory.childAddressLocation === "topic2"
                ? 2
                : 3;
        return `0x${log.topics[topicIndex].substring(start, start + length)}`;
    }
};
export const isAddressMatched = ({ address, blockNumber, childAddresses, }) => {
    if (address === undefined)
        return false;
    if (childAddresses.has(toLowerCase(address)) &&
        childAddresses.get(toLowerCase(address)) <= blockNumber) {
        return true;
    }
    return false;
};
const isValueMatched = (filterValue, eventValue) => {
    // match all
    if (filterValue === null || filterValue === undefined)
        return true;
    // missing value
    if (eventValue === undefined)
        return false;
    // array
    if (Array.isArray(filterValue) &&
        filterValue.some((v) => v === toLowerCase(eventValue))) {
        return true;
    }
    // single
    if (filterValue === toLowerCase(eventValue))
        return true;
    return false;
};
/**
 * Returns `true` if `log` matches `filter`
 */
export const isLogFactoryMatched = ({ factory, log, }) => {
    const addresses = Array.isArray(factory.address)
        ? factory.address
        : [factory.address];
    if (addresses.every((address) => address !== toLowerCase(log.address))) {
        return false;
    }
    if (log.topics.length === 0)
        return false;
    if (factory.eventSelector !== toLowerCase(log.topics[0]))
        return false;
    return true;
};
/**
 * Returns `true` if `log` matches `filter`
 */
export const isLogFilterMatched = ({ filter, log, }) => {
    // Return `false` for out of range blocks
    if (Number(log.blockNumber) < (filter.fromBlock ?? 0) ||
        Number(log.blockNumber) > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    if (isValueMatched(filter.topic0, log.topics[0]) === false)
        return false;
    if (isValueMatched(filter.topic1, log.topics[1]) === false)
        return false;
    if (isValueMatched(filter.topic2, log.topics[2]) === false)
        return false;
    if (isValueMatched(filter.topic3, log.topics[3]) === false)
        return false;
    if (isAddressFactory(filter.address) === false &&
        isValueMatched(filter.address, log.address) === false) {
        return false;
    }
    return true;
};
/**
 * Returns `true` if `transaction` matches `filter`
 */
export const isTransactionFilterMatched = ({ filter, transaction, }) => {
    // Return `false` for out of range blocks
    if (Number(transaction.blockNumber) < (filter.fromBlock ?? 0) ||
        Number(transaction.blockNumber) >
            (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    if (isAddressFactory(filter.fromAddress) === false &&
        isValueMatched(filter.fromAddress, transaction.from) === false) {
        return false;
    }
    if (isAddressFactory(filter.toAddress) === false &&
        transaction.to !== null &&
        isValueMatched(filter.toAddress, transaction.to) === false) {
        return false;
    }
    // NOTE: `filter.includeReverted` is intentionally ignored
    return true;
};
/**
 * Returns `true` if `trace` matches `filter`
 */
export const isTraceFilterMatched = ({ filter, trace, block, }) => {
    // Return `false` for out of range blocks
    if (Number(block.number) < (filter.fromBlock ?? 0) ||
        Number(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    if (isAddressFactory(filter.fromAddress) === false &&
        isValueMatched(filter.fromAddress, trace.from) === false) {
        return false;
    }
    if (isAddressFactory(filter.toAddress) === false &&
        isValueMatched(filter.toAddress, trace.to ?? undefined) === false) {
        return false;
    }
    if (isValueMatched(filter.functionSelector, trace.input.slice(0, 10)) === false) {
        return false;
    }
    // NOTE: `filter.callType` and `filter.includeReverted` is intentionally ignored
    return true;
};
/**
 * Returns `true` if `trace` matches `filter`
 */
export const isTransferFilterMatched = ({ filter, trace, block, }) => {
    // Return `false` for out of range blocks
    if (Number(block.number) < (filter.fromBlock ?? 0) ||
        Number(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    if (trace.value === undefined ||
        trace.value === null ||
        BigInt(trace.value) === 0n) {
        return false;
    }
    if (isAddressFactory(filter.fromAddress) === false &&
        isValueMatched(filter.fromAddress, trace.from) === false) {
        return false;
    }
    if (isAddressFactory(filter.toAddress) === false &&
        isValueMatched(filter.toAddress, trace.to ?? undefined) === false) {
        return false;
    }
    // NOTE: `filter.includeReverted` is intentionally ignored
    return true;
};
/**
 * Returns `true` if `block` matches `filter`
 */
export const isBlockFilterMatched = ({ filter, block, }) => {
    // Return `false` for out of range blocks
    if (Number(block.number) < (filter.fromBlock ?? 0) ||
        Number(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    return (Number(block.number) - filter.offset) % filter.interval === 0;
};
export const defaultBlockFilterInclude = [
    "block.baseFeePerGas",
    "block.difficulty",
    "block.extraData",
    "block.gasLimit",
    "block.gasUsed",
    "block.hash",
    "block.logsBloom",
    "block.miner",
    "block.nonce",
    "block.number",
    "block.parentHash",
    "block.receiptsRoot",
    "block.sha3Uncles",
    "block.size",
    "block.stateRoot",
    "block.timestamp",
    "block.transactionsRoot",
];
const defaultTransactionInclude = [
    "transaction.from",
    "transaction.gas",
    "transaction.hash",
    "transaction.input",
    "transaction.nonce",
    "transaction.r",
    "transaction.s",
    "transaction.to",
    "transaction.transactionIndex",
    "transaction.v",
    "transaction.value",
    // NOTE: type specific properties are not included
];
export const defaultTransactionReceiptInclude = [
    "transactionReceipt.contractAddress",
    "transactionReceipt.cumulativeGasUsed",
    "transactionReceipt.effectiveGasPrice",
    "transactionReceipt.from",
    "transactionReceipt.gasUsed",
    "transactionReceipt.logsBloom",
    "transactionReceipt.status",
    "transactionReceipt.to",
    "transactionReceipt.type",
];
const defaultTraceInclude = [
    "trace.traceIndex",
    "trace.type",
    "trace.from",
    "trace.to",
    "trace.gas",
    "trace.gasUsed",
    "trace.input",
    "trace.output",
    "trace.error",
    "trace.revertReason",
    "trace.value",
];
export const defaultLogFilterInclude = [
    "log.address",
    "log.data",
    "log.logIndex",
    "log.removed",
    "log.topics",
    ...defaultTransactionInclude,
    ...defaultBlockFilterInclude,
];
export const defaultTransactionFilterInclude = [
    ...defaultTransactionInclude,
    ...defaultTransactionReceiptInclude,
    ...defaultBlockFilterInclude,
];
export const defaultTraceFilterInclude = [
    ...defaultBlockFilterInclude,
    ...defaultTransactionInclude,
    ...defaultTraceInclude,
];
export const defaultTransferFilterInclude = [
    ...defaultBlockFilterInclude,
    ...defaultTransactionInclude,
    ...defaultTraceInclude,
];
export const shouldGetTransactionReceipt = (filter) => {
    // transactions must request receipts for "reverted" information
    if (filter.type === "transaction")
        return true;
    if (filter.type === "block")
        return false;
    // TODO(kyle) should include be a required property?
    if (filter.include === undefined)
        return true;
    if (filter.include.some((prop) => prop.startsWith("transactionReceipt."))) {
        return true;
    }
    return false;
};
//# sourceMappingURL=filter.js.map