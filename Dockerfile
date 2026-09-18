FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY scripts/check-client-secrets.js ./scripts/check-client-secrets.js
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8020
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p /app/data && chown node:node /app/data
COPY server ./server
COPY scripts ./scripts
COPY --from=build /app/dist ./dist
USER node
VOLUME ["/app/data"]
EXPOSE 8020
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD ["node", "scripts/check-deployment.js", "--health-only"]
CMD ["node", "server/index.js"]
