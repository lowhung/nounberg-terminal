# Foundry Testing Setup

Simple setup to generate Nouns auction events for testing.

## Quick Start

```bash
# Install forge dependencies
npm install

# Start Anvil and deploy contracts
make test
```

This will:
1. Start Anvil (local blockchain)
2. Deploy SimpleNounsAuction contract  
3. Emit auction events (create → bid → bid → bid → settle)
4. Save transaction logs to `broadcast/Deploy.s.sol/31337/run-latest.json`

## Files

- `src/SimpleNounsAuction.sol` - Contract that emits auction events
- `script/Deploy.s.sol` - Deploys contract and simulates auction
- `Makefile` - Simple commands

## Usage

```bash
make start-anvil  # Start Anvil
make deploy       # Deploy and simulate
make stop-anvil   # Stop Anvil
make test         # Do everything
```

The broadcast JSON will contain all the auction events that Ponder can index.
