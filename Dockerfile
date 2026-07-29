# ---- Build stage ----
FROM oven/bun:1 AS build

WORKDIR /app

# Install all dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# ---- Runtime stage ----
FROM oven/bun:1 AS runtime

WORKDIR /app

# Copy built artifacts and node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/bun.lock ./

# Expose the port
EXPOSE 3000

# Start production server
CMD ["bun", "run", "start"]
