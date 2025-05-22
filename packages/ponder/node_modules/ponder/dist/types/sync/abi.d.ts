import { type Abi, type AbiEvent, type AbiFunction } from "abitype";
import { type Hex } from "viem";
import type { Config } from "../config/index.js";
/**
 * Fix issue with Array.isArray not checking readonly arrays
 * {@link https://github.com/microsoft/TypeScript/issues/17002}
 */
declare global {
    interface ArrayConstructor {
        isArray(arg: ReadonlyArray<any> | any): arg is ReadonlyArray<any>;
    }
}
type AbiEventMeta = {
    safeName: string;
    signature: string;
    selector: Hex;
    item: AbiEvent;
};
type AbiFunctionMeta = {
    safeName: string;
    signature: string;
    selector: Hex;
    item: AbiFunction;
};
export type AbiEvents = {
    bySafeName: {
        [key: string]: AbiEventMeta | undefined;
    };
    bySelector: {
        [key: Hex]: AbiEventMeta | undefined;
    };
};
export type AbiFunctions = {
    bySafeName: {
        [key: string]: AbiFunctionMeta | undefined;
    };
    bySelector: {
        [key: Hex]: AbiFunctionMeta | undefined;
    };
};
export declare const buildAbiEvents: ({ abi }: {
    abi: Abi;
}) => AbiEvents;
export declare function buildTopics(abi: Abi, filter: NonNullable<Config["contracts"][string]["filter"]>): {
    topic0: Hex;
    topic1: Hex | Hex[] | null;
    topic2: Hex | Hex[] | null;
    topic3: Hex | Hex[] | null;
}[];
export declare const buildAbiFunctions: ({ abi }: {
    abi: Abi;
}) => AbiFunctions;
export {};
//# sourceMappingURL=abi.d.ts.map