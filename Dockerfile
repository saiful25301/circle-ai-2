# =============================================================================
# Circle AI — Multi-Stage Dockerfile
# Phase 0: Foundation
# =============================================================================
# Stage 1 (builder): Install Python dependencies into /install
# Stage 2 (runtime): Lean production image with non-root user
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder — install all dependencies
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS builder

LABEL maintainer="Circle AI Team"

# Install OS-level build dependencies (needed for psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for the build stage
WORKDIR /build

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install Python packages into an isolated prefix so we can copy cleanly
RUN pip install --upgrade pip \
    && pip install --prefix=/install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# Stage 2: Runtime — lean image, non-root user
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# Install runtime-only OS dependencies (libpq for psycopg2, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from the builder stage
COPY --from=builder /install /usr/local

# Create a non-root user and group for security
RUN groupadd --gid 1001 circleai \
    && useradd --uid 1001 --gid circleai --shell /bin/bash --create-home circleai

# Set working directory for the application
WORKDIR /app

# Copy application source code
COPY --chown=circleai:circleai . /app

# Create uploads directory with correct ownership
RUN mkdir -p /app/uploads && chown -R circleai:circleai /app/uploads

# Switch to non-root user
USER circleai

# Expose the application port
EXPOSE 8000

# Health check — hits the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
# Workers=1 intentional; horizontal scaling done at compose/orchestration level.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
