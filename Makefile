.PHONY: help install lint format test docker-lint fe-dev fe-build fe-lint be-server be-lint be-test be-docker-up be-docker-down be-docker-logs aws-e2e clean

# Default target
help:
	@echo "Letterboxd Analysis - Developer Commands"
	@echo ""
	@echo "Commands:"
	@echo "  make install         Install all dependencies"
	@echo "  make lint            Lint all code (frontend + backend + docker)"
	@echo "  make format          Format all code"
	@echo "  make test            Run all tests"
	@echo "  make clean           Remove build artifacts & docker volumes"
	@echo ""
	@echo "Frontend:"
	@echo "  make fe-dev          Start frontend dev server"
	@echo "  make fe-build        Build frontend for production"
	@echo ""
	@echo "Backend:"
	@echo "  make be-server       Start local Express server (port 4000)"
	@echo "  make be-test         Run backend unit tests"
	@echo "  make be-docker-up    Start backend Docker containers"
	@echo "  make be-docker-down  Stop backend Docker containers"
	@echo "  make be-docker-logs  View Docker container logs"
	@echo ""
	@echo "AWS E2E: (Requires API_GATEWAY_URL & TEST_USERNAME env vars)"
	@echo "  make aws-e2e         Run E2E test against AWS"

# Setup
install:
	cd frontend && npm install
	cd backend && npm install

# Frontend
fe-dev:
	cd frontend && npm run dev

fe-build:
	cd frontend && npm run build

fe-lint:
	cd frontend && npm run lint

# Backend
be-server:
	cd backend && npm run server

be-lint:
	cd backend && npm run lint

be-test:
	cd backend && npm test

be-docker-up:
	cd backend && docker compose up --build -d

be-docker-down:
	cd backend && docker compose down

be-docker-logs:
	cd backend && docker compose logs -f

# Quality
docker-lint:
	@echo "Linting Dockerfiles with hadolint..."
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/base/Dockerfile
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/lambdas/worker/Dockerfile
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/lambdas/status/Dockerfile
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/lambdas/start/Dockerfile
	docker run --rm -i hadolint/hadolint hadolint --ignore DL3041 - < backend/docker/lambdas/list-scraper/Dockerfile

lint: fe-lint be-lint docker-lint

format:
	cd frontend && npm run format
	cd backend && npm run format

test: be-test

# AWS E2E
aws-e2e:
	cd backend && npm run test:e2e

# Cleanup
clean:
	-cd backend && docker compose down -v --rmi local
