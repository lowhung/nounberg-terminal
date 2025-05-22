import type { Chain, Transport } from "viem";
/**
 * Returns the number of blocks that must pass before a block is considered final.
 * Note that a value of `0` indicates that blocks are considered final immediately.
 *
 * @param network The network to get the finality block count for.
 * @returns The finality block count.
 */
export declare function getFinalityBlockCount({ chainId }: {
    chainId: number;
}): number;
/**
 * Returns the list of RPC URLs backing a Transport.
 *
 * @param transport A viem Transport.
 * @returns Array of RPC URLs.
 */
export declare function getRpcUrlsForClient(parameters: {
    transport: Transport;
    chain: Chain;
}): Promise<any[]>;
/**
 * Returns `true` if the RPC URL is found in the list of public RPC URLs
 * included in viem/chains. Handles both HTTP and WebSocket RPC URLs.
 *
 * @param rpcUrl An RPC URL.
 * @returns Boolean indicating if the RPC URL is public.
 */
export declare function isRpcUrlPublic(rpcUrl: string | undefined): boolean;
//# sourceMappingURL=networks.d.ts.map