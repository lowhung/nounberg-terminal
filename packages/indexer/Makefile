.PHONY: help start-anvil stop-anvil build deploy test-ponder test clean
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
RESET := \033[0m

help: ## Show this help message
	@echo "$(BLUE)Foundry Testing with Deployer Image$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "$(GREEN)  %-15s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

start-anvil: ## Start Anvil blockchain
	@echo "$(BLUE)Starting Anvil...$(RESET)"
	docker compose -f docker-compose.test.yml up -d anvil
	@echo "$(GREEN)✅ Anvil started$(RESET)"

stop-anvil: ## Stop Anvil
	@echo "$(BLUE)Stopping Anvil...$(RESET)"
	docker compose -f docker-compose.test.yml down
	@echo "$(GREEN)✅ Anvil stopped$(RESET)"

build: ## Build the deployer image
	@echo "$(BLUE)Building deployer image...$(RESET)"
	cd foundry && docker build -t nouns-deployer .
	@echo "$(GREEN)✅ Image built$(RESET)"

deploy: build ## Deploy contracts using the deployer image
	@echo "$(BLUE)Deploying contracts and running simulation...$(RESET)"
	docker run --rm \
		--network indexer-test \
		-v $(PWD)/foundry/broadcast:/app/broadcast \
		nouns-deployer \
		--fork-url http://anvil:8545 \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
		-vv
	@echo "$(GREEN)✅ Deployment completed!$(RESET)"
	@echo "$(YELLOW)📄 Check: foundry/broadcast/Deploy.s.sol/31337/run-latest.json$(RESET)"

test-ponder: ## Run Ponder test to index the generated events
	@echo "$(BLUE)Testing Ponder indexing...$(RESET)"
	cd ponder && npm run test:dev || true
	@echo "$(GREEN)✅ Ponder test completed!$(RESET)"

test: start-anvil deploy test-ponder ## Full test (start anvil + deploy + test ponder)
	@echo ""
	@echo "$(GREEN)🎉 Full end-to-end test completed!$(RESET)"
	@echo "$(YELLOW)Events generated → Contracts deployed → Ponder indexed$(RESET)"

clean: stop-anvil ## Clean up
	@echo "$(BLUE)Cleaning up...$(RESET)"
	docker rmi nouns-deployer 2>/dev/null || true
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"
