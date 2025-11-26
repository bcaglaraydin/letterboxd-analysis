.PHONY: install dev dev-backend dev-frontend

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
