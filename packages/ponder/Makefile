.PHONY: help start-anvil stop-anvil build deploy test clean
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "Foundry Testing with Deployer Image"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

start-anvil: ## Start Anvil blockchain
	@echo "Starting Anvil..."
	docker compose -f docker-compose.test.yml up -d anvil

stop-anvil: ## Stop Anvil
	@echo "Stopping Anvil..."
	docker compose -f docker-compose.test.yml down

build: ## Build the deployer image
	@echo "Building deployer image..."
	cd foundry && docker build -t nouns-deployer .

deploy: build ## Deploy contracts using the deployer image
	@echo "Deploying contracts and running simulation..."
	docker run --rm \
		--network ponder-test \
		-v $(PWD)/foundry/broadcast:/app/broadcast \
		nouns-deployer \
		--fork-url http://anvil:8545 \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
		-vv
	@echo "✅ Deployment completed!"
	@echo "📄 Check: foundry/broadcast/Deploy.s.sol/31337/run-latest.json"

test: start-anvil deploy ## Full test (start anvil + deploy)
	@echo "✅ Test completed!"

clean: stop-anvil ## Clean up
	@echo "Cleaning up..."
	docker rmi nouns-deployer 2>/dev/null || true
