# Build stage
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Run stage
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/app/data/dealer.db
COPY --from=build /app ./
# SQLite lives here: mount a persistent disk/volume at /app/data
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "start"]
