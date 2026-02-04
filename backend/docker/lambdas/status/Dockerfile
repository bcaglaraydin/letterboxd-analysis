# LETTERBOXD ANALYSIS - STATUS LAMBDA
# ==============================================================================
# Handles: GET /analysis/status - Returns analysis status and game data
# Browser: Not required - uses lightweight base image
# ==============================================================================

FROM public.ecr.aws/lambda/nodejs:22

# Copy package files first (for layer caching)
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Install production dependencies only
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Handler configuration
CMD ["src/handlers/getAnalysisStatusHandler.handler"]
