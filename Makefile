.PHONY: dev dev-api dev-client install install-api install-client

# Run both dev servers together. Ctrl-C stops both — the trap kills every
# job in this recipe's process group on exit, so one doesn't linger after
# the other (or after Ctrl-C) with its port still held.
dev:
	@trap 'kill 0' EXIT INT TERM; \
	(cd backend-api && npm run dev) & \
	(cd frontend-client/react-ts && npm run dev) & \
	wait

## Run just the backend API dev server.
dev-api:
	cd backend-api && npm run dev

## Run just the frontend dev server.
dev-client:
	cd frontend-client/react-ts && npm run dev

## Install dependencies for both projects.
install: install-api install-client

install-api:
	cd backend-api && npm install

install-client:
	cd frontend-client/react-ts && npm install
