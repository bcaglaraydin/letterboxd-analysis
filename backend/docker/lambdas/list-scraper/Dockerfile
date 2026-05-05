# LETTERBOXD ANALYSIS - LIST SCRAPER LAMBDA
# ==============================================================================
# Handles: SQS messages to scrape user film lists
# Browser: Required (Cloudflare bypass)
# ==============================================================================

ARG BASE_IMAGE_URI=public.ecr.aws/lambda/nodejs:24
FROM --platform=$BUILDPLATFORM node:24-slim AS builder
WORKDIR /build

# Copy and install dependencies in a native environment (no QEMU)
COPY package*.json ./
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
ARG GH_PAT
RUN if [ -n "$GH_PAT" ]; then \
      git config --global url."https://${GH_PAT}@github.com/".insteadOf "ssh://git@github.com/"; \
      git config --global url."https://${GH_PAT}@github.com/".insteadOf "git@github.com:"; \
      git config --global url."https://${GH_PAT}@github.com/".insteadOf "https://github.com/"; \
    fi
RUN npm ci --omit=dev && npm cache clean --force

# Now transition to the actual ARM64 runtime image
FROM ${BASE_IMAGE_URI}

# Copy the pre-built node_modules from the native builder
COPY --from=builder /build/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Copy application source code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Handler configuration
CMD ["src/handlers/listScraperHandler.handler"]

