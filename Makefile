# ==============================================================================
# Letterboxd Analysis - Makefile
# ==============================================================================
# Cross-platform developer commands. Run `make help` for usage.
#
# For Windows PowerShell compatibility, most commands delegate to scripts/*.ps1
# or call npm/docker directly.
# ==============================================================================

.PHONY: help install lint format test docker-lint \
        fe-dev fe-build fe-lint fe-test \
        be-server be-lint be-test be-docker-up be-docker-down be-docker-logs \
        aws-e2e clean

# ==============================================================================
# HELP
# ==============================================================================

help:
	@echo ============================================
	@echo Letterboxd Analysis - Developer Commands
	@echo ============================================
	@echo.
	@echo SETUP:
	@echo   make install         Install all dependencies
	@echo.
	@echo FRONTEND (Next.js):
	@echo   make fe-dev          Start frontend dev server
	@echo   make fe-build        Build frontend for production
	@echo   make fe-lint         Lint frontend code
	@echo.
	@echo BACKEND:
	@echo   make be-server       Start local Express server (port 4000)
	@echo   make be-lint         Lint backend code
	@echo   make be-test         Run backend unit tests
	@echo   make be-docker-up    Start backend Docker containers
	@echo   make be-docker-down  Stop backend Docker containers
	@echo   make be-docker-logs  View Docker container logs
	@echo.
	@echo QUALITY:
	@echo   make lint            Lint all code (frontend + backend + docker)
	@echo   make docker-lint     Lint Dockerfiles with hadolint
	@echo   make format          Format all code
	@echo   make test            Run all tests
	@echo.
	@echo AWS:
	@echo   make aws-e2e         Run E2E test against AWS (requires env vars)
	@echo.
	@echo CLEANUP:
	@echo   make clean           Remove build artifacts
	@echo.
	@echo ENVIRONMENT VARIABLES (for aws-e2e):
	@echo   API_GATEWAY_URL      API Gateway endpoint URL
	@echo   TEST_USERNAME        Letterboxd username to test with
	@echo.

# ==============================================================================
# SETUP
# ==============================================================================

install:
	cd frontend && npm install
	cd backend && npm install

# ==============================================================================
# FRONTEND
# ==============================================================================

fe-dev:
	cd frontend && npm run dev

fe-build:
	cd frontend && npm run build

fe-lint:
	cd frontend && npm run lint

# ==============================================================================
# BACKEND
# ==============================================================================

be-server:
	cd backend && npm run server

be-lint:
	cd backend && npm run lint

be-test:
	cd backend && npm test

be-docker-up:
	cd backend && docker-compose up --build -d

be-docker-down:
	cd backend && docker-compose down

be-docker-logs:
	cd backend && docker-compose logs -f

# ==============================================================================
# QUALITY (ALL)
# ==============================================================================

docker-lint:
	@echo Linting Dockerfiles with hadolint...
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/base/Dockerfile
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/lambdas/worker/Dockerfile
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/lambdas/status/Dockerfile
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/lambdas/start/Dockerfile
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/lambdas/list-scraper/Dockerfile
	@echo Docker lint passed!

lint: fe-lint be-lint docker-lint

format:
	cd frontend && npm run format
	cd backend && npm run format

test: be-test

# ==============================================================================
# AWS E2E
# ==============================================================================

aws-e2e:
	@echo Running E2E test against AWS...
	@echo Requires: API_GATEWAY_URL and TEST_USERNAME environment variables
	cd backend && npm run test:e2e

# ==============================================================================
# CLEANUP
# ==============================================================================

clean:
	cd backend && docker-compose down -v --rmi local 2>nul || echo Docker cleanup skipped
	@echo Cleanup complete.
