import type { Common } from '../internal/common.js';
import type { Network } from '../internal/types.js';
import { type Queue } from './queue.js';
import { type EIP1193Parameters, type PublicRpcSchema } from "viem";
import type { DebugRpcSchema } from "./debug.js";
type Schema = [...PublicRpcSchema, ...DebugRpcSchema];
type RequestReturnType<method extends EIP1193Parameters<Schema>["method"]> = Extract<Schema[number], {
    Method: method;
}>["ReturnType"];
export type RequestQueue = Omit<Queue<RequestReturnType<EIP1193Parameters<Schema>["method"]>, EIP1193Parameters<Schema>>, "add"> & {
    request: <TParameters extends EIP1193Parameters<Schema>>(parameters: TParameters) => Promise<RequestReturnType<TParameters["method"]>>;
};
/**
 * Creates a queue to manage rpc requests.
 */
export declare const createRequestQueue: ({ common, network, concurrency, }: {
    common: Common;
    network: Network;
    concurrency?: number | undefined;
}) => RequestQueue;
export {};
//# sourceMappingURL=requestQueue.d.ts.map