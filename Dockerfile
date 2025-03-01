FROM debian:bullseye-slim as whisper-builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Clone and build whisper.cpp
WORKDIR /build
RUN git clone https://github.com/ggerganov/whisper.cpp.git && \
    cd whisper.cpp && \
    make && \
    cp main /usr/local/bin/whisper-cli

# Download the small model
RUN mkdir -p /models && \
    cd /models && \
    wget -O small.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin

FROM oven/bun:latest as runner

# Install FFmpeg and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy whisper.cpp and models from the builder
COPY --from=whisper-builder /usr/local/bin/whisper-cli /usr/local/bin/
COPY --from=whisper-builder /models /app/models

# Set up working directory
WORKDIR /app

# Create a directory for temp audio files
RUN mkdir -p /tmp/whisper-audio && chmod 777 /tmp/whisper-audio

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --production

# Copy application files
COPY . .

# Environment variables
ENV PORT=3000
ENV WHISPER_MODELS_PATH=/app/models
ENV WHISPER_MODEL=small
ENV TEMP=/tmp

# Expose port
EXPOSE 3000

# Run the application (build frontend + start server)
CMD ["bun", "start"] 