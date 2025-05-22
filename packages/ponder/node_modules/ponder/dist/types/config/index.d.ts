/// <reference types="node" resolution-mode="require"/>
import type { ConnectionOptions } from "node:tls";
import type { Prettify } from '../types/utils.js';
import type { Abi } from "abitype";
import type { Narrow, Transport } from "viem";
import type { AddressConfig } from "./address.js";
import type { GetEventFilter } from "./eventFilter.js";
export type Config = {
    database?: DatabaseConfig;
    ordering?: "omnichain" | "multichain";
    networks: {
        [networkName: string]: NetworkConfig<unknown>;
    };
    contracts: {
        [contractName: string]: GetContract;
    };
    accounts: {
        [accountName: string]: AccountConfig<unknown>;
    };
    blocks: {
        [sourceName: string]: GetBlockFilter<unknown>;
    };
};
export type CreateConfigReturnType<networks, contracts, accounts, blocks> = {
    database?: DatabaseConfig;
    ordering?: "omnichain" | "multichain";
    networks: networks;
    contracts: contracts;
    accounts: accounts;
    blocks: blocks;
};
export declare const createConfig: <const networks, const contracts = {}, const accounts = {}, const blocks = {}>(config: {
    database?: DatabaseConfig | undefined;
    ordering?: "omnichain" | "multichain" | undefined;
    networks: NetworksConfig<Narrow<networks>>;
    contracts?: ContractsConfig<networks, Narrow<contracts>> | undefined;
    accounts?: AccountsConfig<networks, Narrow<accounts>> | undefined;
    blocks?: BlockFiltersConfig<networks, blocks> | undefined;
}) => CreateConfigReturnType<networks, contracts, accounts, blocks>;
type DatabaseConfig = {
    kind: "pglite";
    /** Directory path to use for PGlite database files. Default: `".ponder/pglite"`. */
    directory?: string;
} | {
    kind: "postgres";
    /** Postgres database connection string. Default: `DATABASE_PRIVATE_URL` > `DATABASE_URL` environment variable. */
    connectionString?: string;
    /** Postgres pool configuration passed to `node-postgres`. */
    poolConfig?: {
        /** Maximum number of clients in the pool. Default: `30`. */
        max?: number;
        /** Enable SSL, or provide a custom SSL configuration. Default: `undefined`. */
        ssl?: boolean | Prettify<ConnectionOptions>;
    };
};
type BlockConfig = {
    /** Block number at which to start indexing events (inclusive). If `undefined`, events will be processed from block 0. Default: `undefined`. */
    startBlock?: number | "latest";
    /** Block number at which to stop indexing events (inclusive). If `undefined`, events will be processed in real-time. Default: `undefined`. */
    endBlock?: number | "latest";
};
type TransactionReceiptConfig = {
    includeTransactionReceipts?: boolean;
};
type FunctionCallConfig = {
    includeCallTraces?: boolean;
};
type NetworkConfig<network> = {
    /** Chain ID of the network. */
    chainId: network extends {
        chainId: infer chainId extends number;
    } ? chainId | number : number;
    /** A viem `http`, `webSocket`, or `fallback` [Transport](https://viem.sh/docs/clients/transports/http.html).
     *
     * __To avoid rate limiting, include a custom RPC URL.__ Usage:
     *
     * ```ts
     * import { http } from "viem";
     *
     * const network = {
     *    name: "mainnet",
     *    chainId: 1,
     *    transport: http("https://eth-mainnet.g.alchemy.com/v2/..."),
     * }
     * ```
     */
    transport: Transport;
    /** Polling interval (in ms). Default: `1_000`. */
    pollingInterval?: number;
    /** Maximum number of RPC requests per second. Default: `50`. */
    maxRequestsPerSecond?: number;
    /** Disable RPC request caching. Default: `false`. */
    disableCache?: boolean;
};
type NetworksConfig<networks> = {} extends networks ? {} : {
    [networkName in keyof networks]: NetworkConfig<networks[networkName]>;
};
type AbiConfig<abi extends Abi | readonly unknown[]> = {
    /** Contract application byte interface. */
    abi: abi;
};
type GetContractNetwork<networks, abi extends Abi, allNetworkNames extends string = [keyof networks] extends [never] ? string : keyof networks & string> = {
    /**
     * Network that this contract is deployed to. Must match a network name in `networks`.
     * Any filter information overrides the values in the higher level "contracts" property.
     */
    network: allNetworkNames | {
        [name in allNetworkNames]?: Prettify<AddressConfig & GetEventFilter<abi> & TransactionReceiptConfig & FunctionCallConfig & BlockConfig>;
    };
};
type ContractConfig<networks, abi extends Abi> = Prettify<AbiConfig<abi> & GetContractNetwork<networks, abi> & AddressConfig & GetEventFilter<abi> & TransactionReceiptConfig & FunctionCallConfig & BlockConfig>;
type GetContract<networks = unknown, contract = unknown> = contract extends {
    abi: infer abi extends Abi;
} ? ContractConfig<networks, abi> : ContractConfig<networks, Abi>;
type ContractsConfig<networks, contracts> = {} extends contracts ? {} : {
    [name in keyof contracts]: GetContract<networks, contracts[name]>;
};
type GetAccountNetwork<networks, allNetworkNames extends string = [keyof networks] extends [never] ? string : keyof networks & string> = {
    /**
     * Network that this account is deployed to. Must match a network name in `networks`.
     * Any filter information overrides the values in the higher level "accounts" property.
     */
    network: allNetworkNames | {
        [name in allNetworkNames]?: Prettify<AddressConfig & TransactionReceiptConfig & BlockConfig>;
    };
};
type AccountConfig<networks> = Prettify<GetAccountNetwork<networks> & Required<AddressConfig> & TransactionReceiptConfig & BlockConfig>;
type AccountsConfig<networks, accounts> = {} extends accounts ? {} : {
    [name in keyof accounts]: AccountConfig<networks>;
};
type BlockFilterConfig = {
    /** Block number at which to start indexing events (inclusive). If `undefined`, events will be processed from block 0. Default: `undefined`. */
    startBlock?: number | "latest";
    /** Block number at which to stop indexing events (inclusive). If `undefined`, events will be processed in real-time. Default: `undefined`. */
    endBlock?: number | "latest";
    interval?: number;
};
type GetBlockFilter<networks, allNetworkNames extends string = [keyof networks] extends [never] ? string : keyof networks & string> = BlockFilterConfig & {
    network: allNetworkNames | {
        [name in allNetworkNames]?: BlockFilterConfig;
    };
};
type BlockFiltersConfig<networks = unknown, blocks = unknown> = {} extends blocks ? {} : {
    [name in keyof blocks]: GetBlockFilter<networks>;
};
export {};
//# sourceMappingURL=index.d.ts.map