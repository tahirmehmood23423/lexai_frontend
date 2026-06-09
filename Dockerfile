FROM python:3.11-slim

WORKDIR /app

ENV PYTHONPATH=/app \
    HF_HOME=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/huggingface \
    CHROMA_DB_PATH=/app/chroma_db \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --default-timeout=1000 \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

COPY backend/ .

RUN python download_models.py

RUN useradd -m -u 1000 user && \
    mkdir -p /app/.cache/huggingface /app/chroma_db && \
    chown -R user:user /app

USER user

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=900s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]