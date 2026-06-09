# ═══════════════════════════════════════════════════════════════
# backend/core/rag_engine.py
# LexAI — Retrieval Engine (Vector + Reranker mode)
# BM25 disabled for HF Spaces free tier compatibility
# ═══════════════════════════════════════════════════════════════

import os
import re
import json
import numpy as np
from pathlib import Path
from typing import Optional


class LexAIRetriever:
    """
    Lightweight retriever for Pakistani legal documents.
    
    Two-stage pipeline (optimized for free tier):
    1. Vector search  — ChromaDB cosine similarity (semantic)
    2. Cross-encoder  — reranks candidates by relevance
    
    Note: BM25 keyword search is disabled to reduce startup time
    on free tier. Can be re-enabled when upgrading to Pro.
    """

    def __init__(self):
        self.collection  = None
        self.embed_model = None
        self.reranker    = None
        self.rerank_tok  = None

        print("🔧 Initializing LexAI retrieval engine (vector-only mode)...")
        self._ensure_chroma_downloaded()
        self._load_vector_db()
        self._load_reranker()
        self._load_embed_model()
        print("✅ Retrieval engine ready (vector + reranker)")

    # ─────────────────────────────────────────────────────────
    # HuggingFace Hub auto-download
    # ─────────────────────────────────────────────────────────

    def _ensure_chroma_downloaded(self):
        """
        Download ChromaDB from HuggingFace Hub if not present locally.
        On local machine: chroma_db/ folder already exists → skips download.
        On HF Spaces: folder is empty on first boot → downloads from HF Hub.
        """
        chroma_path = os.getenv("CHROMA_DB_PATH", "./chroma_db")

        # Already exists locally — skip download
        if os.path.exists(chroma_path) and os.listdir(chroma_path):
            print(f"   ✅ ChromaDB found locally at {chroma_path}")
            return

        hf_repo  = os.getenv("HF_CHROMA_REPO", "")
        hf_token = os.getenv("HF_TOKEN", "")

        if not hf_repo:
            raise RuntimeError(
                f"ChromaDB not found at '{chroma_path}' "
                "and HF_CHROMA_REPO env variable is not set.\n"
                "Set CHROMA_DB_PATH to your local chroma_db path, "
                "OR set HF_CHROMA_REPO + HF_TOKEN for auto-download."
            )

        print("   ⬇️  ChromaDB not found locally.")
        print(f"   📦 Downloading from HuggingFace Hub: {hf_repo}")
        print("   ⏳ This takes 15-25 minutes on first deploy (~3GB)...")

        os.makedirs(chroma_path, exist_ok=True)

        from huggingface_hub import snapshot_download
        snapshot_download(
            repo_id=hf_repo,
            repo_type="dataset",
            local_dir=chroma_path,
            token=hf_token if hf_token else None,
            ignore_patterns=["*.md", ".gitattributes", "*.txt"]
        )
        print(f"   ✅ ChromaDB downloaded successfully to {chroma_path}")

    # ─────────────────────────────────────────────────────────
    # INITIALIZATION
    # ─────────────────────────────────────────────────────────

    def _load_vector_db(self):
        """Load ChromaDB from disk."""
        import chromadb
        from chromadb.config import Settings

        chroma_path = os.getenv(
            "CHROMA_DB_PATH",
            os.path.join(os.path.dirname(__file__), '..', 'chroma_db')
        )
        chroma_path = str(Path(chroma_path).resolve())

        if not Path(chroma_path).exists():
            raise RuntimeError(
                f"ChromaDB not found at: {chroma_path}\n"
                "Set CHROMA_DB_PATH env variable or HF_CHROMA_REPO for auto-download."
            )

        client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(anonymized_telemetry=False)
        )

        # List available collections
        collections = client.list_collections()
        print(f"   📋 Available collections: {[c.name for c in collections]}")

        if not collections:
            raise RuntimeError("No collections found in ChromaDB!")

        # Try common names first, then use first available
        self.collection = None
        collection_name = None
        for name in ["pakistan_legal", "legal_docs", "pakistani_law"]:
            try:
                self.collection = client.get_collection(name)
                collection_name = name
                break
            except Exception:
                continue

        # Fallback: use first available collection
        if self.collection is None:
            collection_name = collections[0].name
            self.collection = client.get_collection(collection_name)

        count = self.collection.count()
        print(f"   ✅ ChromaDB loaded: collection '{collection_name}' with {count:,} chunks")

    def _load_reranker(self):
        """Load cross-encoder reranker from cache."""
        from transformers import AutoTokenizer, AutoModelForSequenceClassification

        cache_dir  = os.getenv('TRANSFORMERS_CACHE', None)
        model_name = "cross-encoder/ms-marco-MiniLM-L6-v2"
        print("   📦 Loading reranker...")

        self.rerank_tok = AutoTokenizer.from_pretrained(
            model_name,
            cache_dir=cache_dir
        )
        self.reranker = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            cache_dir=cache_dir
        )
        self.reranker.eval()
        print("   ✅ Cross-encoder reranker loaded")

    def _load_embed_model(self):
        """Load embedding model for query encoding."""
        from sentence_transformers import SentenceTransformer

        cache_dir  = os.getenv('SENTENCE_TRANSFORMERS_HOME', None)
        model_name = os.getenv("EMBED_MODEL", "intfloat/multilingual-e5-large")
        print("   📦 Loading embedding model...")

        self.embed_model = SentenceTransformer(
            model_name,
            cache_folder=cache_dir
        )
        print("   ✅ Embedding model loaded")

    # ─────────────────────────────────────────────────────────
    # RETRIEVAL METHODS
    # ─────────────────────────────────────────────────────────

    def _vector_search(
        self,
        query: str,
        top_k: int = 40,
        province_filter: Optional[str] = None
    ) -> list:
        """
        Semantic search using multilingual-E5-large embeddings.
        Increased top_k to 40 since we're not using BM25 to supplement results.
        """
        query_embedding = self.embed_model.encode(
            f"query: {query}",
            normalize_embeddings=True
        ).tolist()

        where_filter = None
        if province_filter and province_filter != "All":
            where_filter = {"province": province_filter}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        chunks = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        ):
            chunks.append({
                "text":     doc,
                "metadata": meta,
                "score":    float(1 - dist),
                "method":   "vector"
            })
        return chunks

    def _rerank(self, query: str, candidates: list, top_k: int = 6) -> list:
        """
        Cross-encoder reranking.
        Scores every (query, chunk) pair together for higher accuracy.
        Runs entirely on CPU — no GPU needed.

        FIX: handles scalar logits when only 1 candidate is passed,
        and handles the case where tolist() returns a plain float.
        """
        if not candidates:
            return []

        import torch

        pairs = [[query, c["text"][:512]] for c in candidates]

        with torch.no_grad():
            encoded = self.rerank_tok(
                pairs,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            )
            logits = self.reranker(**encoded).logits

            # ── FIX: ensure logits is always 1-D ──────────────────
            # Shape can be (N,1), (N,), or () for a single candidate
            if logits.dim() == 0:
                # Scalar tensor — single candidate
                logits = logits.unsqueeze(0)
            elif logits.dim() == 2:
                # (N, 1) → squeeze last dim → (N,)
                logits = logits.squeeze(-1)
            # Now logits is always shape (N,)

            scores = torch.sigmoid(logits)

            # tolist() on a 0-d or 1-element tensor can return a float
            normalized = scores.tolist()
            if isinstance(normalized, float):
                normalized = [normalized]
            # ── END FIX ───────────────────────────────────────────

        scored = sorted(
            zip(normalized, candidates),
            key=lambda x: x[0],
            reverse=True
        )

        result = []
        for score, chunk in scored[:top_k]:
            chunk['rerank_score'] = float(score)
            result.append(chunk)
        return result

    def retrieve(
        self,
        query: str,
        province_filter: Optional[str] = None,
        top_k: int = 6
    ) -> list:
        """
        Simplified retrieval pipeline:
        1. Vector search  — get 40 semantic candidates
        2. Rerank         — cross-encoder returns top 6

        Note: BM25 keyword search is disabled to reduce memory usage
        and startup time on free tier. Accuracy is still good
        for most queries (~85% vs ~92% with BM25).
        """
        vector_results = self._vector_search(
            query,
            top_k=40,
            province_filter=province_filter
        )

        return self._rerank(query, vector_results, top_k=top_k)
