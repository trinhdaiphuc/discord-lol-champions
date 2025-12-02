# syntax = docker/dockerfile:1

# Base image with Bun runtime
FROM oven/bun:1 AS base
LABEL fly_launch_runtime="Bun"
WORKDIR /app

# Install runtime dependencies for canvas + fonts
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    fontconfig \
    fonts-liberation && \
    fc-cache -fv && \
    rm -rf /var/lib/apt/lists/*


# Build stage - extends base with build tools
FROM base AS build

# Install build dependencies for canvas native module
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev && \
    rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock* ./
RUN  bun install --frozen-lockfile --production

COPY . .


# Final stage - clean base with just the app
FROM base
COPY --from=build /app /app
EXPOSE 3000

CMD ["bun", "start"]
