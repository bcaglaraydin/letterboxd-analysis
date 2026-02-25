# LETTERBOXD ANALYSIS - WORKER LAMBDA
# ==============================================================================
# Handles: SQS messages to scrape individual film details
# Browser: Required (Cloudflare bypass)
# ==============================================================================

ARG BASE_IMAGE_URI=public.ecr.aws/lambda/nodejs:22
FROM --platform=$BUILDPLATFORM node:22-slim AS builder
WORKDIR /build

# Copy and install dependencies in a native environment (no QEMU)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Now transition to the actual ARM64 runtime image
FROM ${BASE_IMAGE_URI}

# Copy the pre-built node_modules from the native builder
COPY --from=builder /build/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Copy application source code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Handler configuration
CMD ["src/handlers/filmScraperWorker.handler"]
