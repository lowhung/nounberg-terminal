.PHONY: help dev prod test stop clean dev-indexer dev-api dev-workers dev-frontend
.DEFAULT_GOAL := help

# Colors
GREEN := \033[32m
BLUE := \033[34m
YELLOW := \033[33m
RESET := \033[0m

help: ## Show this help message
	@echo "$(BLUE)Nounberg Terminal$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "$(GREEN)%-15s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

dev: ## Start shared infrastructure (postgres, redis, memcached)
	@echo "$(BLUE)Starting shared infrastructure...$(RESET)"
	@docker compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✅ Infrastructure ready$(RESET)"

dev-indexer: dev ## Start infrastructure + indexer service
	@echo "$(BLUE)Starting indexer service...$(RESET)"
	@docker compose up -d indexer
	@echo "$(GREEN)✅ Indexer ready$(RESET)"

dev-api: dev ## Start infrastructure + API service
	@echo "$(BLUE)Starting API service...$(RESET)"
	@docker compose up -d api
	@echo "$(GREEN)✅ API ready$(RESET)"

dev-workers: dev ## Start infrastructure + workers service
	@echo "$(BLUE)Starting workers service...$(RESET)"
	@docker compose up -d workers queue
	@echo "$(GREEN)✅ Workers ready$(RESET)"

dev-frontend: dev ## Start infrastructure + frontend service
	@echo "$(BLUE)Starting frontend service...$(RESET)"
	@docker compose up -d frontend
	@echo "$(GREEN)✅ Frontend ready$(RESET)"

start: ## Build and start full production stack
	@echo "$(BLUE)Starting production stack...$(RESET)"
	@docker compose up --build
	@echo "$(GREEN)✅ Production ready$(RESET)"

test: ## Run all tests
	@cd packages/indexer && make test

stop: ## Stop all services
	@docker compose down && docker compose -f docker-compose.dev.yml down

clean: ## Clean up everything
	@docker compose down && docker system prune -f