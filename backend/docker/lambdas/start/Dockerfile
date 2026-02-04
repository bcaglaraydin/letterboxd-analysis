# LETTERBOXD ANALYSIS - START LAMBDA
# ==============================================================================
# Handles: POST /analysis - Starts analysis for a username
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
CMD ["src/handlers/startAnalysisHandler.handler"]
