# ANF-AIOps Makefile
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# Unified build and development commands

.PHONY: help setup build test clean install dev prod docker lint format audit docs

# Default target
.DEFAULT_GOAL := help

# Variables
SHELL := /bin/bash
BUILD_MODE ?= development
PARALLEL ?= true
SKIP_TESTS ?= false
CLEAN ?= false

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
NC := \033[0m

# Help target
help: ## Show this help message
	@echo "$(PURPLE)ANF-AIOps Development Commands$(NC)"
	@echo "$(BLUE)Author: Dwiref Sharma <DwirefS@SapientEdge.io>$(NC)"
	@echo ""
	@echo "$(YELLOW)Usage: make [target] [options]$(NC)"
	@echo ""
	@echo "$(GREEN)Setup & Installation:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(setup|install)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(dev|build|test|lint)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Deployment:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(prod|docker|deploy)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(clean|audit|docs)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make setup              $(BLUE)# Setup development environment$(NC)"
	@echo "  make build              $(BLUE)# Build all components$(NC)"
	@echo "  make dev                $(BLUE)# Start development environment$(NC)"
	@echo "  make test               $(BLUE)# Run all tests$(NC)"
	@echo "  make docker-up          $(BLUE)# Start with Docker Compose$(NC)"
	@echo "  make prod BUILD_MODE=production $(BLUE)# Production build$(NC)"

# Setup and Installation
setup: ## Setup complete development environment
	@echo "$(GREEN)Setting up ANF-AIOps development environment...$(NC)"
	@chmod +x scripts/*.sh
	@./scripts/setup-dev-environment.sh
	@echo "$(GREEN)✓ Development environment setup completed$(NC)"

install: ## Install all project dependencies
	@echo "$(GREEN)Installing project dependencies...$(NC)"
	@./scripts/install-dependencies.sh install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

install-force: ## Force clean install of all dependencies
	@echo "$(GREEN)Force installing dependencies...$(NC)"
	@FORCE_INSTALL=true ./scripts/install-dependencies.sh install
	@echo "$(GREEN)✓ Dependencies force installed$(NC)"

# Development
dev: install ## Start development environment
	@echo "$(GREEN)Starting development environment...$(NC)"
	@echo "$(YELLOW)Choose your development method:$(NC)"
	@echo "  1. Docker Compose (recommended): make docker-up"
	@echo "  2. Local services: make dev-local"
	@echo "  3. Individual components: make dev-mcp, make dev-bot, etc."

dev-local: ## Start local development services
	@echo "$(GREEN)Starting local development services...$(NC)"
	@echo "$(BLUE)Starting MCP Server...$(NC)"
	@cd src/mcp-server && npm run dev &
	@echo "$(BLUE)Starting Teams Bot...$(NC)"
	@cd src/teams-bot && npm run dev &
	@echo "$(BLUE)Starting RAG System...$(NC)"
	@cd rag && npm run dev &
	@echo "$(BLUE)Starting Azure Functions...$(NC)"
	@cd functions/ANFServer && func start &
	@echo "$(GREEN)✓ All services started. Press Ctrl+C to stop.$(NC)"
	@wait

dev-mcp: ## Start MCP Server in development mode
	@cd src/mcp-server && npm run dev

dev-bot: ## Start Teams Bot in development mode
	@cd src/teams-bot && npm run dev

dev-rag: ## Start RAG System in development mode
	@cd rag && npm run dev

dev-functions: ## Start Azure Functions in development mode
	@cd functions/ANFServer && func start

# Building
build: ## Build all components
	@echo "$(GREEN)Building all components...$(NC)"
	@BUILD_MODE=$(BUILD_MODE) PARALLEL_BUILD=$(PARALLEL) SKIP_TESTS=$(SKIP_TESTS) CLEAN_BUILD=$(CLEAN) ./scripts/build-all.sh $(BUILD_MODE)
	@echo "$(GREEN)✓ Build completed$(NC)"

build-prod: ## Build for production
	@make build BUILD_MODE=production

build-clean: ## Clean build all components
	@make build CLEAN=true

build-mcp: ## Build MCP Server only
	@echo "$(GREEN)Building MCP Server...$(NC)"
	@cd src/mcp-server && npm run build
	@echo "$(GREEN)✓ MCP Server built$(NC)"

build-bot: ## Build Teams Bot only
	@echo "$(GREEN)Building Teams Bot...$(NC)"
	@cd src/teams-bot && npm run build
	@echo "$(GREEN)✓ Teams Bot built$(NC)"

build-rag: ## Build RAG System only
	@echo "$(GREEN)Building RAG System...$(NC)"
	@cd rag && npm run build
	@echo "$(GREEN)✓ RAG System built$(NC)"

build-functions: ## Build Azure Functions only
	@echo "$(GREEN)Building Azure Functions...$(NC)"
	@cd functions/ANFServer && dotnet build
	@echo "$(GREEN)✓ Azure Functions built$(NC)"

# Testing
test: ## Run all tests
	@echo "$(GREEN)Running all tests...$(NC)"
	@make test-mcp
	@make test-bot
	@make test-rag
	@make test-functions
	@echo "$(GREEN)✓ All tests completed$(NC)"

test-mcp: ## Run MCP Server tests
	@echo "$(BLUE)Testing MCP Server...$(NC)"
	@cd src/mcp-server && npm test

test-bot: ## Run Teams Bot tests
	@echo "$(BLUE)Testing Teams Bot...$(NC)"
	@cd src/teams-bot && npm test

test-rag: ## Run RAG System tests
	@echo "$(BLUE)Testing RAG System...$(NC)"
	@cd rag && npm test

test-functions: ## Run Azure Functions tests
	@echo "$(BLUE)Testing Azure Functions...$(NC)"
	@cd functions/ANFServer && dotnet test

test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running E2E tests...$(NC)"
	@cd tests/e2e && npm test

test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	@cd tests/integration && npm test

test-coverage: ## Generate test coverage reports
	@echo "$(BLUE)Generating test coverage...$(NC)"
	@cd src/mcp-server && npm run test:coverage
	@cd src/teams-bot && npm run test:coverage
	@cd rag && npm run test:coverage
	@cd functions/ANFServer && dotnet test --collect:"XPlat Code Coverage"

# Code Quality
lint: ## Run linting on all projects
	@echo "$(GREEN)Running linters...$(NC)"
	@cd src/mcp-server && npm run lint
	@cd src/teams-bot && npm run lint
	@cd rag && npm run lint
	@echo "$(GREEN)✓ Linting completed$(NC)"

format: ## Format code in all projects
	@echo "$(GREEN)Formatting code...$(NC)"
	@cd src/mcp-server && npm run format || true
	@cd src/teams-bot && npm run format || true
	@cd rag && npm run format || true
	@cd functions/ANFServer && dotnet format || true
	@echo "$(GREEN)✓ Code formatting completed$(NC)"

lint-fix: ## Fix linting issues automatically
	@echo "$(GREEN)Fixing linting issues...$(NC)"
	@cd src/mcp-server && npm run lint:fix || true
	@cd src/teams-bot && npm run lint:fix || true
	@cd rag && npm run lint:fix || true
	@echo "$(GREEN)✓ Linting fixes applied$(NC)"

# Security and Auditing
audit: ## Audit dependencies for security issues
	@echo "$(GREEN)Auditing dependencies...$(NC)"
	@./scripts/install-dependencies.sh audit
	@echo "$(GREEN)✓ Security audit completed$(NC)"

audit-fix: ## Automatically fix security issues
	@echo "$(GREEN)Fixing security issues...$(NC)"
	@cd src/mcp-server && npm audit fix || true
	@cd src/teams-bot && npm audit fix || true
	@cd rag && npm audit fix || true
	@echo "$(GREEN)✓ Security fixes applied$(NC)"

# Docker Operations
docker-build: ## Build Docker images
	@echo "$(GREEN)Building Docker images...$(NC)"
	@docker-compose build
	@echo "$(GREEN)✓ Docker images built$(NC)"

docker-up: ## Start services with Docker Compose
	@echo "$(GREEN)Starting services with Docker Compose...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✓ Services started$(NC)"
	@echo "$(YELLOW)Services running at:$(NC)"
	@echo "  MCP Server: http://localhost:3000"
	@echo "  Teams Bot: http://localhost:3978"
	@echo "  RAG System: http://localhost:3001"
	@echo "  Azure Functions: http://localhost:7071"
	@echo "  Redis Commander: http://localhost:8081"
	@echo "  Swagger UI: http://localhost:8080"

docker-up-dev: ## Start development services with Docker Compose
	@echo "$(GREEN)Starting development services...$(NC)"
	@docker-compose --profile development up -d
	@echo "$(GREEN)✓ Development services started$(NC)"

docker-down: ## Stop Docker Compose services
	@echo "$(GREEN)Stopping Docker services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

docker-logs: ## View Docker Compose logs
	@docker-compose logs -f

docker-clean: ## Clean Docker images and containers
	@echo "$(GREEN)Cleaning Docker resources...$(NC)"
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "$(GREEN)✓ Docker cleaned$(NC)"

# Production Deployment
prod: ## Build for production deployment
	@echo "$(GREEN)Building for production...$(NC)"
	@make build-prod
	@make test
	@echo "$(GREEN)✓ Production build completed$(NC)"

deploy-dev: ## Deploy to development environment
	@echo "$(GREEN)Deploying to development...$(NC)"
	@cd src/infrastructure && az deployment group create --resource-group anf-aiops-dev --template-file main.bicep --parameters @environments/dev.parameters.json
	@echo "$(GREEN)✓ Deployed to development$(NC)"

deploy-prod: ## Deploy to production environment
	@echo "$(GREEN)Deploying to production...$(NC)"
	@make prod
	@cd src/infrastructure && az deployment group create --resource-group anf-aiops-prod --template-file main.bicep --parameters @environments/prod.parameters.json
	@echo "$(GREEN)✓ Deployed to production$(NC)"

# Maintenance
clean: ## Clean all build artifacts and dependencies
	@echo "$(GREEN)Cleaning project...$(NC)"
	@./scripts/install-dependencies.sh clean
	@find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
	@echo "$(GREEN)✓ Project cleaned$(NC)"

clean-docker: ## Clean Docker resources
	@make docker-clean

clean-all: ## Clean everything (build artifacts, dependencies, Docker)
	@make clean
	@make clean-docker

update: ## Update all dependencies
	@echo "$(GREEN)Updating dependencies...$(NC)"
	@./scripts/install-dependencies.sh update
	@echo "$(GREEN)✓ Dependencies updated$(NC)"

# Documentation
docs: ## Generate documentation
	@echo "$(GREEN)Generating documentation...$(NC)"
	@echo "$(BLUE)Available documentation:$(NC)"
	@echo "  📖 User Guide: docs/USER-GUIDE.md"
	@echo "  🔧 API Reference: docs/API-REFERENCE.md"
	@echo "  🚀 Deployment Guide: docs/DEPLOYMENT-GUIDE.md"
	@echo "  🛠️ Administrator Guide: docs/ADMINISTRATOR-GUIDE.md"
	@echo "$(GREEN)✓ Documentation ready$(NC)"

docs-serve: ## Serve documentation locally
	@echo "$(GREEN)Serving documentation...$(NC)"
	@python3 -m http.server 8000 --directory docs/ || python -m SimpleHTTPServer 8000

# Utilities
status: ## Show project status
	@echo "$(GREEN)ANF-AIOps Project Status$(NC)"
	@echo "$(YELLOW)Node.js:$(NC) $(shell node --version 2>/dev/null || echo 'Not installed')"
	@echo "$(YELLOW).NET SDK:$(NC) $(shell dotnet --version 2>/dev/null || echo 'Not installed')"
	@echo "$(YELLOW)Docker:$(NC) $(shell docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',' || echo 'Not installed')"
	@echo "$(YELLOW)Azure CLI:$(NC) $(shell az --version 2>/dev/null | head -n1 | cut -d' ' -f2 || echo 'Not installed')"
	@echo ""
	@echo "$(YELLOW)Project Components:$(NC)"
	@echo "  MCP Server: $(shell [ -d "src/mcp-server/dist" ] && echo "✓ Built" || echo "✗ Not built")"
	@echo "  Teams Bot: $(shell [ -d "src/teams-bot/dist" ] && echo "✓ Built" || echo "✗ Not built")"
	@echo "  RAG System: $(shell [ -d "rag/dist" ] && echo "✓ Built" || echo "✗ Not built")"
	@echo "  Azure Functions: $(shell [ -d "functions/ANFServer/bin" ] && echo "✓ Built" || echo "✗ Not built")"
	@echo ""
	@echo "$(YELLOW)Docker Services:$(NC)"
	@docker-compose ps 2>/dev/null || echo "  No services running"

health: ## Check system health
	@echo "$(GREEN)Checking system health...$(NC)"
	@./scripts/health-check.sh 2>/dev/null || echo "Health check script not available"

# Quick commands
quick-start: ## Quick start for new developers
	@echo "$(GREEN)🚀 Quick Start for ANF-AIOps$(NC)"
	@echo "$(YELLOW)1.$(NC) Setting up environment..."
	@make setup
	@echo "$(YELLOW)2.$(NC) Installing dependencies..."
	@make install
	@echo "$(YELLOW)3.$(NC) Building projects..."
	@make build
	@echo "$(YELLOW)4.$(NC) Running tests..."
	@make test
	@echo "$(GREEN)✅ Ready for development!$(NC)"
	@echo "$(BLUE)Next: Run 'make docker-up' or 'make dev-local'$(NC)"

ci: ## Run CI pipeline locally
	@echo "$(GREEN)Running CI pipeline locally...$(NC)"
	@make lint
	@make build
	@make test
	@make audit
	@echo "$(GREEN)✅ CI pipeline completed successfully$(NC)"