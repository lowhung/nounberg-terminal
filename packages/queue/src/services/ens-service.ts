import {Address, createPublicClient, http} from 'viem';
import {mainnet} from 'viem/chains';
import {logger} from '../logger';
import {ENS_UNIVERSAL_RESOLVER_BLOCK} from '../constants';

export class EnsService {
    private provider: any;

    constructor(rpcUrl?: string) {
        const url = rpcUrl || process.env.ETHEREUM_RPC_URL || process.env.PONDER_RPC_URL_1;
        this.provider = createPublicClient({
            chain: mainnet,
            transport: http(url || ''),
        });
    }

    async resolveEnsName(address: string, blockNumber: number): Promise<string | null> {
        if (blockNumber < ENS_UNIVERSAL_RESOLVER_BLOCK) {
            logger.debug(`Block ${blockNumber} is before ENS resolver, skipping ENS for ${address}`);
            return null;
        }

        try {
            return await this.provider.getEnsName({address: address.toLowerCase() as Address});
        } catch (error) {
            logger.error({ msg: `Error resolving ENS for ${address}`, error });
            return null;
        }
    }
}
