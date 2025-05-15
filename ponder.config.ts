import { createConfig } from "ponder";
import { http } from "viem";

import { NounsAuctionHouseAbi } from "./abis/NounsAuctionHouseAbi";

export default createConfig({
  networks: {
    mainnet: {
      chainId: 1,
      transport: http(process.env.PONDER_RPC_URL_1),
    },
  },
  contracts: {
    NounsAuctionHouse: {
      network: "mainnet",
      abi: NounsAuctionHouseAbi,
      address: "0x830BD73E4184cef73443C15111a1DF14e495C706",
      startBlock: 19258213,
    },
  },
});