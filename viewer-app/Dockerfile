# Stage 1: Build the application
FROM oven/bun:latest AS builder
WORKDIR /usr/src/app

# Install dependencies including devDependencies needed for build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .


RUN bun run build

# Stage 2: Create the production image
FROM oven/bun:latest AS production
WORKDIR /usr/src/app

# Copy only production dependencies configuration
COPY package.json bun.lock ./
# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist/. ./dist/

EXPOSE 3000

CMD ["bun", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
