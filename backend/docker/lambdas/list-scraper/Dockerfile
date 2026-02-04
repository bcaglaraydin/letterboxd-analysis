# LETTERBOXD ANALYSIS - LIST SCRAPER LAMBDA
# ==============================================================================
# Handles: SQS messages to scrape user film lists
# Browser: Required (Cloudflare bypass)
# ==============================================================================

ARG BASE_IMAGE_URI
FROM ${BASE_IMAGE_URI}

# Copy package files first (for layer caching)
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Install production dependencies only
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Handler configuration
CMD ["src/handlers/listScraperHandler.handler"]
