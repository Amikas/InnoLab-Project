FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/app/.npm \
    npm ci --prefer-offline --cache /app/.npm

FROM base AS builder
COPY . .
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
