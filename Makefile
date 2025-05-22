.PHONY: help dev prod build up down logs clean clean-all health status restart
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
RESET := \033[0m

help: ## Show this help message
	@echo "$(BLUE)Nounberg Terminal - Docker Management$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "$(GREEN)%-15s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Examples:$(RESET)"
	@echo "  make dev     # Start development infrastructure only"
	@echo "  make prod    # Build and start full production stack"
	@echo "  make logs    # Follow logs for all services"
	@echo "  make clean   # Clean up containers and images"

dev: ## Start development infrastructure (databases, cache) only
	@echo "$(BLUE)🚀 Starting Nounberg Terminal development stack...$(RESET)"
	@echo "Starting databases and cache services..."
	@docker compose -f docker-compose.dev.yml up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "$(GREEN)✅ Development infrastructure is ready!$(RESET)"
	@echo ""
	@echo "You can now start individual services:"
	@echo "  make dev-ponder     # Start Ponder service"
	@echo "  make dev-workers    # Start workers service"
	@echo "  make dev-api        # Start API service"
	@echo "  make dev-frontend   # Start frontend service"
	@echo ""
	@echo "Or start all application services: $(YELLOW)make dev-services$(RESET)"
	@echo "To stop infrastructure: $(YELLOW)make dev-down$(RESET)"

dev-down: ## Stop development infrastructure
	@echo "$(BLUE)Stopping development infrastructure...$(RESET)"
	@docker compose -f docker-compose.dev.yml down
	@echo "$(GREEN)✅ Development infrastructure stopped$(RESET)"

dev-services: ## Start all application services (requires dev infrastructure)
	@echo "$(BLUE)Starting all application services...$(RESET)"
	@docker compose up -d ponder api workers frontend
	@echo "$(GREEN)✅ All services started$(RESET)"

dev-ponder: ## Start only Ponder service
	@docker compose up -d ponder

dev-api: ## Start only API service
	@docker compose up -d api

dev-workers: ## Start only workers service
	@docker compose up -d workers

dev-frontend: ## Start only frontend service
	@docker compose up -d frontend

prod: build up ## Build and start full production stack
	@echo "Waiting for services to be ready..."
	@sleep 30
	@echo "$(GREEN)✅ Production stack is ready!$(RESET)"
	@echo ""
	@echo "$(BLUE)Services running:$(RESET)"
	@echo "  🔗 Ponder (GraphQL): http://localhost:42069"
	@echo "  🌐 API Server: http://localhost:3000"
	@echo "  🎨 Frontend: http://localhost:8080"
	@echo "  📊 API Health: http://localhost:3000/api/health"
	@echo ""
	@echo "To check logs: $(YELLOW)make logs$(RESET)"
	@echo "To stop: $(YELLOW)make down$(RESET)"

build: ## Build all Docker images
	@echo "$(BLUE)🏗️ Building Docker images...$(RESET)"
	@docker compose build

up: ## Start all services (assumes images are built)
	@echo "$(BLUE)Starting all services...$(RESET)"
	@docker compose up -d

down: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(RESET)"
	@docker compose down
	@docker compose -f docker-compose.dev.yml down
	@echo "$(GREEN)✅ All services stopped$(RESET)"

restart: down up ## Restart all services

logs: ## Follow logs for all services
	@docker compose logs -f

logs-%: ## Follow logs for specific service (e.g. make logs-api)
	@docker compose logs -f $*

status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(RESET)"
	@docker compose ps

health: ## Check health of all services
	@echo "$(BLUE)Health Check:$(RESET)"
	@echo "API Health:" && curl -s http://localhost:3000/api/health || echo "❌ API not responding"
	@echo "Ponder:" && curl -s http://localhost:42069 || echo "❌ Ponder not responding"
	@echo "Frontend:" && curl -s http://localhost:8080 || echo "❌ Frontend not responding"

clean: ## Clean up containers and images
	@echo "$(BLUE)🧹 Cleaning up Docker resources...$(RESET)"
	@echo "Stopping containers..."
	@docker compose down
	@docker compose -f docker-compose.dev.yml down
	@echo "Removing built images..."
	@docker rmi $$(docker images "nounberg-terminal*" -q) 2>/dev/null || echo "No images to remove"
	@echo "Cleaning build cache..."
	@docker builder prune -f
	@echo "$(GREEN)✅ Cleanup complete!$(RESET)"

clean-all: clean ## Clean up everything including volumes (DESTRUCTIVE!)
	@echo "$(YELLOW)⚠️  This will remove all volumes and data!$(RESET)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker volume prune -f
	@echo "$(GREEN)✅ All volumes removed$(RESET)"

# Individual service commands
ponder-logs: ## Show Ponder logs
	@docker compose logs -f ponder

api-logs: ## Show API logs
	@docker compose logs -f api

workers-logs: ## Show workers logs
	@docker compose logs -f workers

frontend-logs: ## Show frontend logs
	@docker compose logs -f frontend

# Development helpers
shell-%: ## Get shell access to service (e.g. make shell-api)
	@docker compose exec $* sh

rebuild-%: ## Rebuild specific service (e.g. make rebuild-workers)
	@echo "$(BLUE)Rebuilding $* service...$(RESET)"
	@docker compose build $*
	@docker compose up -d $*
	@echo "$(GREEN)✅ $* service rebuilt and restarted$(RESET)"
