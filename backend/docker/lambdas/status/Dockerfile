# LETTERBOXD ANALYSIS - STATUS LAMBDA
# ==============================================================================
# Handles: GET /analysis/status - Returns analysis status and game data
# Browser: Not required
# ==============================================================================

ARG BASE_IMAGE_URI
FROM ${BASE_IMAGE_URI}

# Copy package files first (for layer caching)
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Handler configuration
CMD ["src/handlers/getAnalysisStatusHandler.handler"]
