import {createConfig} from "ponder";
import {getAddress, Hex, hexToNumber, http} from "viem";
import {NounsAuctionHouseAbi} from "./abis/NounsAuctionHouseAbi";
import AuctionHouseDeploy from "./foundry/broadcast/Deploy.s.sol/31337/run-latest.json";

const testAddress = getAddress(AuctionHouseDeploy.transactions[0]!.contractAddress);
const testStartBlock = hexToNumber(AuctionHouseDeploy.receipts[0]!.blockNumber as Hex);

export default createConfig({
    networks: {
        anvil: {
            chainId: 31337,
            transport: http("http://127.0.0.1:8545"),
            disableCache: true, // Critical for local testing / hot reloading
        },
    },
    contracts: {
        NounsAuctionHouse: {
            network: "anvil",
            abi: NounsAuctionHouseAbi,
            address: testAddress,
            startBlock: testStartBlock,

        },
    },
});