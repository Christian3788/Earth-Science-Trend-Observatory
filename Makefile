.PHONY: help install dev build start preview lint test verify-science smoke clean

NPM ?= npm
BASE_URL ?= http://localhost:3000

help: ## Show available targets
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

install: ## Install dependencies
	$(NPM) install --legacy-peer-deps

dev: ## Start the app in development mode (Express + Vite)
	$(NPM) run dev

build: ## Create the production frontend build in dist/
	$(NPM) run build

start: ## Start the server (set NODE_ENV=production to serve dist/)
	$(NPM) start

preview: ## Preview the Vite build as a static frontend (no API)
	$(NPM) run preview

lint: ## Run TypeScript checking
	$(NPM) run lint

test: ## Run the test suite
	$(NPM) test

verify-science: ## Run the science/statistical-correctness tests
	$(NPM) run verify:science

smoke: ## Run end-to-end smoke tests (server must be running; override with BASE_URL=...)
	bash scripts/smoke.sh $(BASE_URL)

clean: ## Remove build artifacts
	$(NPM) run clean
