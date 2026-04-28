# LETTERBOXD ANALYSIS - START LAMBDA
# ==============================================================================
# Handles: POST /analysis - Starts analysis for a username
# Browser: Not required - uses lightweight base image
# ==============================================================================

FROM --platform=$BUILDPLATFORM node:22-slim AS builder
WORKDIR /build

# Copy from native runner and install dependencies (no QEMU)
COPY package*.json ./

# Install git to fetch private dependencies and configure GitHub token if provided
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
ARG GH_PAT
RUN if [ -n "$GH_PAT" ]; then \
      git config --global url."https://${GH_PAT}@github.com/".insteadOf "ssh://git@github.com/"; \
      git config --global url."https://${GH_PAT}@github.com/".insteadOf "git@github.com:"; \
      git config --global url."https://${GH_PAT}@github.com/".insteadOf "https://github.com/"; \
    fi
RUN npm ci --omit=dev && npm cache clean --force

# Now transition to the actual ARM64 runtime image
FROM public.ecr.aws/lambda/nodejs:22

# Copy the pre-built node_modules from the native builder
COPY --from=builder /build/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Copy application source code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Handler configuration
CMD ["src/handlers/apiRouterHandler.handler"]

