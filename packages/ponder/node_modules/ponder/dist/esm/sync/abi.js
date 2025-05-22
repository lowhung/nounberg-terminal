import { getDuplicateElements } from '../utils/duplicates.js';
import { formatAbiItem, } from "abitype";
import { encodeEventTopics, getAbiItem, parseAbiItem, toEventSelector, toFunctionSelector, } from "viem";
export const buildAbiEvents = ({ abi }) => {
    const abiEvents = abi
        .filter((item) => item.type === "event")
        .filter((item) => item.anonymous === undefined || item.anonymous === false);
    const overloadedEventNames = getDuplicateElements(abiEvents.map((item) => item.name));
    return abiEvents.reduce((acc, item) => {
        const signature = formatAbiItem(item);
        const safeName = overloadedEventNames.has(item.name)
            ? signature.split("event ")[1]
            : item.name;
        const selector = toEventSelector(item);
        const abiEventMeta = { safeName, signature, selector, item };
        acc.bySafeName[safeName] = abiEventMeta;
        acc.bySelector[selector] = abiEventMeta;
        return acc;
    }, { bySafeName: {}, bySelector: {} });
};
export function buildTopics(abi, filter) {
    const filters = Array.isArray(filter) ? filter : [filter];
    const topics = filters.map((filter) => {
        // Single event with args
        const topics = encodeEventTopics({
            abi: [findAbiEvent(abi, filter.event)],
            args: filter.args,
        });
        return {
            topic0: topics[0],
            topic1: topics[1] ?? null,
            topic2: topics[2] ?? null,
            topic3: topics[3] ?? null,
        };
    });
    return topics;
}
/**
 * Finds the event ABI item for the event name or event signature.
 *
 * @param eventName Event name or event signature if there are duplicates
 */
const findAbiEvent = (abi, eventName) => {
    if (eventName.includes("(")) {
        // full event signature
        return parseAbiItem(`event ${eventName}`);
    }
    else {
        return getAbiItem({ abi, name: eventName });
    }
};
export const buildAbiFunctions = ({ abi }) => {
    const abiFunctions = abi.filter((item) => item.type === "function");
    const overloadedFunctionNames = getDuplicateElements(abiFunctions.map((item) => item.name));
    return abiFunctions.reduce((acc, item) => {
        const signature = formatAbiItem(item);
        const safeName = overloadedFunctionNames.has(item.name)
            ? signature.split("function ")[1]
            : `${item.name}()`;
        const selector = toFunctionSelector(item);
        const abiEventMeta = { safeName, signature, selector, item };
        acc.bySafeName[safeName] = abiEventMeta;
        acc.bySelector[selector] = abiEventMeta;
        return acc;
    }, { bySafeName: {}, bySelector: {} });
};
//# sourceMappingURL=abi.js.map