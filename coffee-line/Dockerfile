###########################################################################
# Stage 1: Build Stage
###########################################################################
FROM oven/bun:latest AS builder
WORKDIR /app

# Copy dependency files and install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy the rest of your source code
COPY . .

RUN bun run build

###########################################################################
# Stage 2: Production Stage
###########################################################################
FROM oven/bun:latest
WORKDIR /app

# Copy only the built assets and necessary files to run the preview server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock* ./
COPY --from=builder /app/vite.config.ts ./vite.config.ts

# Install production dependencies including vite
RUN bun install vite

# Expose the port your app will run on
EXPOSE 3001

# Start the production preview server
CMD ["bunx", "vite", "preview", "--host", "--port", "3001"]