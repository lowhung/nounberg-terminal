// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {SimpleNounsAuction} from "../src/SimpleNounsAuction.sol";

contract Deploy is Script {
    function setUp() public {}

    function run() external {
        vm.startBroadcast();

        // Deploy the simple auction contract
        SimpleNounsAuction auction = new SimpleNounsAuction();

        // Simulate auction events for Noun #721
        auction.createAuction(721);

        auction.createBid{value: 1 ether}(721);

        auction.createBid{value: 2.5 ether}(721);

        auction.createBid{value: 4.2 ether}(721);

        auction.settleAuction(721, msg.sender, 4.2 ether);

        vm.stopBroadcast();
    }
}
