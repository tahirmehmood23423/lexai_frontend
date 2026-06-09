FROM python:3.11-slim

WORKDIR /app

ENV PYTHONPATH=/app \
    HF_HOME=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/huggingface \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps (cached layer)
COPY backend/requirements.txt .
RUN pip install --default-timeout=1000 \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# Application code
COPY backend/ .

# Pre-download PUBLIC models at build time (cached in image)
# ChromaDB is private and downloads at runtime instead
RUN python download_models.py

# HF Spaces convention: non-root user with UID 1000
RUN useradd -m -u 1000 user && \
    mkdir -p /app/.cache/huggingface /app/data && \
    chown -R user:user /app

USER user

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=600s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

# Entrypoint downloads ChromaDB (needs HF_TOKEN at runtime), then starts API
CMD ["sh", "-c", "python download_chroma.py && uvicorn main:app --host 0.0.0.0 --port 7860"]