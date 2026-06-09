"""
Download all AI models during Docker build (not at runtime).
This runs once during Railway deployment to cache models.
"""
import os

# Set cache directories
os.environ['TRANSFORMERS_CACHE'] = '/app/.cache/huggingface'
os.environ['HF_HOME'] = '/app/.cache/huggingface'
os.environ['SENTENCE_TRANSFORMERS_HOME'] = '/app/.cache/huggingface'

print("=" * 60)
print("📥 Pre-downloading AI models for LexAI...")
print("=" * 60)

try:
    print("\n1️⃣ Downloading embedding model (intfloat/multilingual-e5-large)...")
    print("   Size: ~2.2 GB | ETA: 5-10 minutes")
    from sentence_transformers import SentenceTransformer
    embed_model = SentenceTransformer("intfloat/multilingual-e5-large")
    print("   ✅ Embedding model cached successfully")
except Exception as e:
    print(f"   ❌ Failed to download embedding model: {e}")
    raise

try:
    print("\n2️⃣ Downloading reranker model (cross-encoder/ms-marco-MiniLM-L6-v2)...")
    print("   Size: ~22 MB | ETA: 30 seconds")
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    tokenizer = AutoTokenizer.from_pretrained("cross-encoder/ms-marco-MiniLM-L6-v2")
    model = AutoModelForSequenceClassification.from_pretrained("cross-encoder/ms-marco-MiniLM-L6-v2")
    print("   ✅ Reranker model cached successfully")
except Exception as e:
    print(f"   ❌ Failed to download reranker model: {e}")
    raise

print("\n" + "=" * 60)
print("🎉 All AI models downloaded and cached successfully!")
print("=" * 60)
print("Cache location: /app/.cache/huggingface")
print("Models will load instantly on startup.")
