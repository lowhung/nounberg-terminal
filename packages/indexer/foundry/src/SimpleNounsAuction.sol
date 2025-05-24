// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.6;

/**
 * @title Simple Mock for Nouns Auction Events
 * @notice Just emits the events we need for testing
 */
contract SimpleNounsAuction {
    event AuctionCreated(uint256 indexed nounId, uint256 startTime, uint256 endTime);
    event AuctionBid(uint256 indexed nounId, address sender, uint256 value, bool extended);
    event AuctionSettled(uint256 indexed nounId, address winner, uint256 amount);

    function createAuction(uint256 nounId) external {
        emit AuctionCreated(nounId, block.timestamp, block.timestamp + 24 hours);
    }

    function createBid(uint256 nounId) external payable {
        emit AuctionBid(nounId, msg.sender, msg.value, false);
    }

    function settleAuction(uint256 nounId, address winner, uint256 amount) external {
        emit AuctionSettled(nounId, winner, amount);
    }
}
