FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p /app/data && chown node:node /app/data
COPY server ./server
COPY scripts ./scripts
COPY --from=build /app/dist ./dist
USER node
VOLUME ["/app/data"]
EXPOSE 3001
CMD ["node", "server/index.js"]
