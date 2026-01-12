.PHONY: install dev dev-backend dev-frontend format lint

install:
	npm install
	cd backend && npm install
	cd frontend && npm install

dev:
	npm run dev

dev-backend:
	cd backend && npm run start:local

dev-frontend:
	cd frontend && npm run dev

lint:
	terraform fmt -check -recursive infra/
	cd backend && npm run lint
	cd frontend && npm run lint
	cd backend && npx prettier --check "../**/*.{yml,yaml,md}" --ignore-path ../.gitignore

format:
	terraform fmt -recursive infra/
	cd backend && npm run format
	cd frontend && npm run format
	cd backend && npx prettier --write "../**/*.{yml,yaml,md}" --ignore-path ../.gitignore
