# syntax=docker/dockerfile:1
#
# Build context is this directory (frontend-client/); the actual Vite app
# lives in the react-ts/ subdirectory.

# ---------------------------------------------------------------------------
# Stage 1: builder — install dependencies and produce the Vite production
# build (react-ts/dist)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY react-ts/package.json react-ts/package-lock.json ./
RUN npm ci

COPY react-ts/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: runtime — static build served by nginx
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
