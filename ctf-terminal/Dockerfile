FROM node:18-alpine

# Install Docker CLI (needed for Docker socket access)
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/app/.npm \
    npm ci --omit=dev --prefer-offline --cache /app/.npm

COPY server.js ./

# Ensure the app runs as root or docker group
USER root

EXPOSE 3001

# Containers must accept traffic from outside their own network namespace.
ENV TERMINAL_BIND_ADDRESS=0.0.0.0

CMD ["node", "server.js"]
