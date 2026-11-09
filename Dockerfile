# Build stage
FROM node:22-slim AS build
WORKDIR /app
# better-sqlite3 is a native module: if its prebuilt binary can't be downloaded it compiles from source,
# which needs Python, make and a C++ compiler (not present in node:22-slim).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
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
