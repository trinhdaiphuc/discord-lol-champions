# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.9.0

# Base image with runtime dependencies (shared by build and final)
FROM node:${NODE_VERSION}-slim AS base
LABEL fly_launch_runtime="Node.js"
WORKDIR /app
ENV NODE_ENV="production"

# Install PM2 globally for process management
RUN npm install -g pm2

# Install runtime dependencies for canvas + fonts (installed once, inherited by all stages)
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

# Install ONLY build dependencies (dev headers)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev && \
    rm -rf /var/lib/apt/lists/*

COPY package-lock.json package.json ./
RUN npm ci
COPY . .


# Final stage - clean base with just the app (no apt-get needed!)
FROM base
COPY --from=build /app /app
EXPOSE 3000

# Use pm2-runtime with ecosystem config for proper signal handling
CMD [ "pm2-runtime", "ecosystem.config.js" ]
