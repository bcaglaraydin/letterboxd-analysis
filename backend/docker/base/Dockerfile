# LETTERBOXD ANALYSIS - BASE IMAGE
# ==============================================================================
# Contains: Node.js 22 runtime + Chromium + System dependencies
# This image is shared by all Lambda functions that need browser capabilities.
#
# Key considerations for running Chromium in Lambda containers:
# - HOME=/tmp is required because Chromium writes temp files to $HOME
# - System libraries for headless Chrome must be installed
# - /tmp is the only writable directory in Lambda
#
# Build for local (amd64): docker build --build-arg ARCH=amd64 .
# Build for AWS (arm64): docker build --build-arg ARCH=arm64 .
# ==============================================================================

# Allow architecture selection via --platform flag or Docker's default
# Local dev: docker build . (uses host architecture, typically amd64)
# AWS CI: docker build --platform linux/arm64 . 
FROM public.ecr.aws/lambda/nodejs:24

# ------------------------------------------------------------------------------
# Environment Variables for Lambda + Chromium
# ------------------------------------------------------------------------------
# HOME=/tmp is CRITICAL - Chromium writes temp files to $HOME which is not
# writable in Lambda by default. /tmp is the only writable directory.
ENV HOME=/tmp
ENV TMPDIR=/tmp

# Playwright configuration
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0

# Chromium path for our application
ENV CHROMIUM_PATH=/opt/browsers

# Disable Chromium sandbox (required in Lambda/Docker)
ENV CHROME_DEVEL_SANDBOX=""

# Node.js optimization for Lambda
ENV NODE_OPTIONS="--enable-source-maps"

# ------------------------------------------------------------------------------
# System Dependencies for Chromium
# ------------------------------------------------------------------------------
# These are required for headless Chromium to run on Amazon Linux 2023.
# Based on best practices from running Playwright in Docker containers.
RUN dnf install -y \
    # Core dependencies for Chromium
    alsa-lib \
    atk \
    cups-libs \
    gtk3 \
    libdrm \
    libgbm \
    libXcomposite \
    libXdamage \
    libXext \
    libXfixes \
    libXrandr \
    libxkbcommon \
    mesa-libgbm \
    nspr \
    nss \
    nss-util \
    pango \
    # Graphics and rendering
    libX11 \
    libXcursor \
    libXi \
    libXrender \
    libXtst \
    # Additional Chrome dependencies
    at-spi2-atk \
    at-spi2-core \
    dbus-libs \
    expat \
    glib2 \
    # Fonts (critical for proper rendering, prevents blank pages)
    liberation-fonts \
    google-noto-sans-fonts \
    google-noto-cjk-fonts-common \
    # Additional libs often needed
    libxshmfence \
    xdg-utils \
    # Certificate authorities (for HTTPS)
    ca-certificates \
    # Clean up to reduce image size
    && dnf clean all \
    && rm -rf /var/cache/dnf /tmp/* /var/tmp/*

# ------------------------------------------------------------------------------
# Install Chromium for Playwright
# ------------------------------------------------------------------------------
# Pin version to match package.json playwright-core version (1.58.0)
# Only install Chromium, not Firefox or WebKit
RUN npm install -g playwright-core@1.58.0 && \
    npx playwright-core install chromium && \
    chmod -R 755 /opt/browsers && \
    npm cache clean --force && \
    # Verify Chromium was installed
    ls -la /opt/browsers/

# ------------------------------------------------------------------------------
# Create writable directories
# ------------------------------------------------------------------------------
# Ensure /tmp has proper permissions for Chromium temp files
RUN mkdir -p /tmp/.cache && \
    chmod -R 777 /tmp

# ------------------------------------------------------------------------------
# Create app directory structure
# ------------------------------------------------------------------------------
WORKDIR ${LAMBDA_TASK_ROOT}

# ------------------------------------------------------------------------------
# Default entry point (will be overridden by Lambda CMD)
# ------------------------------------------------------------------------------
CMD ["src/handlers/index.handler"]
