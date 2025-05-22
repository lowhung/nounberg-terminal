import { dedupe } from '../utils/dedupe.js';
import { toLowerCase } from '../utils/lowercase.js';
import { getBytesConsumedByParam } from '../utils/offset.js';
import { toEventSelector } from "viem";
export function buildLogFactory({ address: _address, event, parameter, chainId, fromBlock, toBlock, }) {
    const address = Array.isArray(_address)
        ? dedupe(_address)
            .map(toLowerCase)
            .sort((a, b) => (a < b ? -1 : 1))
        : toLowerCase(_address);
    const eventSelector = toEventSelector(event);
    // Check if the provided parameter is present in the list of indexed inputs.
    const indexedInputPosition = event.inputs
        .filter((x) => "indexed" in x && x.indexed)
        .findIndex((input) => input.name === parameter);
    if (indexedInputPosition > -1) {
        return {
            type: "log",
            chainId,
            address,
            eventSelector,
            // Add 1 because inputs will not contain an element for topic0 (the signature).
            childAddressLocation: `topic${(indexedInputPosition + 1)}`,
            fromBlock,
            toBlock,
        };
    }
    const nonIndexedInputs = event.inputs.filter((x) => !("indexed" in x && x.indexed));
    const nonIndexedInputPosition = nonIndexedInputs.findIndex((input) => input.name === parameter);
    if (nonIndexedInputPosition === -1) {
        throw new Error(`Factory event parameter not found in factory event signature. Got '${parameter}', expected one of [${event.inputs
            .map((i) => `'${i.name}'`)
            .join(", ")}].`);
    }
    let offset = 0;
    for (let i = 0; i < nonIndexedInputPosition; i++) {
        offset += getBytesConsumedByParam(nonIndexedInputs[i]);
    }
    return {
        type: "log",
        chainId,
        address,
        eventSelector,
        childAddressLocation: `offset${offset}`,
        fromBlock,
        toBlock,
    };
}
//# sourceMappingURL=factory.js.map