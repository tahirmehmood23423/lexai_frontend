# ═══════════════════════════════════════════════════════════════
# backend/core/rag_engine.py
# LexAI — Retrieval Engine (Hybrid mode: Vector + BM25 + Reranker)
# ═══════════════════════════════════════════════════════════════

import os
import re
import json
import numpy as np
from pathlib import Path
from typing import Optional

from core.bm25_index import BM25Retriever


class LexAIRetriever:
    """
    Hybrid retriever for Pakistani legal documents.

    Three-stage pipeline:
    1. Dense retrieval  — ChromaDB cosine similarity (semantic, paraphrases)
    2. Sparse retrieval — BM25 keyword (exact statutes, proper nouns)
       → Fused via Reciprocal Rank Fusion (RRF)
    3. Cross-encoder    — reranks fused candidates by relevance

    Designed for HF Spaces free tier (16 GB RAM).
    """

    def __init__(self):
        self.collection  = None
        self.embed_model = None
        self.reranker    = None
        self.rerank_tok  = None
        self.bm25        = None

        print("🔧 Initializing LexAI retrieval engine (hybrid mode)...")
        self._ensure_chroma_downloaded()
        self._load_vector_db()
        self._load_reranker()
        self._load_embed_model()
        self._load_bm25_index()
        print("✅ Retrieval engine ready (vector + BM25 + reranker)")

    # ─────────────────────────────────────────────────────────
    # HuggingFace Hub auto-download
    # ─────────────────────────────────────────────────────────

    def _ensure_chroma_downloaded(self):
        """Download ChromaDB from HuggingFace Hub if not present locally."""
        chroma_path = os.getenv("CHROMA_DB_PATH", "./chroma_db")

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

        collections = client.list_collections()
        print(f"   📋 Available collections: {[c.name for c in collections]}")

        if not collections:
            raise RuntimeError("No collections found in ChromaDB!")

        self.collection = None
        collection_name = None
        for name in ["pakistan_legal", "legal_docs", "pakistani_law"]:
            try:
                self.collection = client.get_collection(name)
                collection_name = name
                break
            except Exception:
                continue

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

        self.rerank_tok = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
        self.reranker = AutoModelForSequenceClassification.from_pretrained(
            model_name, cache_dir=cache_dir
        )
        self.reranker.eval()
        print("   ✅ Cross-encoder reranker loaded")

    def _load_embed_model(self):
        """Load embedding model for query encoding."""
        from sentence_transformers import SentenceTransformer

        cache_dir  = os.getenv('SENTENCE_TRANSFORMERS_HOME', None)
        model_name = os.getenv("EMBED_MODEL", "intfloat/multilingual-e5-large")
        print("   📦 Loading embedding model...")

        self.embed_model = SentenceTransformer(model_name, cache_folder=cache_dir)
        print("   ✅ Embedding model loaded")

    def _load_bm25_index(self):
        """Load BM25 index from disk, or build it from Chroma if missing."""
        print("   📦 Loading BM25 index...")
        self.bm25 = BM25Retriever()
        if not self.bm25.load():
            print("   ⚠️  BM25 index not found — building from Chroma (one-time, ~10 min)")
            self.bm25.build_from_chroma(self.collection)

    # ─────────────────────────────────────────────────────────
    # RETRIEVAL METHODS
    # ─────────────────────────────────────────────────────────

    def _vector_search(
        self,
        query: str,
        top_k: int = 30,
        province_filter: Optional[str] = None
    ) -> list:
        """Semantic search using multilingual-E5-large embeddings."""
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
        for chunk_id, doc, meta, dist in zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        ):
            chunks.append({
                "id":       chunk_id,
                "text":     doc,
                "metadata": meta,
                "score":    float(1 - dist),
                "method":   "vector"
            })
        return chunks

    def _bm25_search(
        self,
        query: str,
        top_k: int = 30,
        province_filter: Optional[str] = None
    ) -> list:
        """Keyword search using BM25 — best for statutes, names, exact terms."""
        return self.bm25.search(query, top_k=top_k, province_filter=province_filter)

    @staticmethod
    def _rrf_fuse(dense_results: list, sparse_results: list, k: int = 60, top_n: int = 20) -> list:
        """
        Reciprocal Rank Fusion: combines two ranked lists.
        score(doc) = sum over retrievers of 1 / (k + rank_in_that_retriever)
        k=60 is the value from the original RRF paper (Cormack et al. 2009).
        """
        scores: dict = {}
        docs: dict = {}

        for rank, item in enumerate(dense_results):
            doc_id = item["id"]
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank + 1)
            docs[doc_id] = item

        for rank, item in enumerate(sparse_results):
            doc_id = item["id"]
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank + 1)
            if doc_id not in docs:
                docs[doc_id] = item

        fused_ids = sorted(scores.keys(), key=lambda i: scores[i], reverse=True)[:top_n]

        fused = []
        for doc_id in fused_ids:
            item = dict(docs[doc_id])
            item["score"] = float(scores[doc_id])
            item["method"] = "hybrid"
            fused.append(item)
        return fused

    def _rerank(self, query: str, candidates: list, top_k: int = 6) -> list:
        """Cross-encoder reranking. Runs on CPU."""
        if not candidates:
            return []

        import torch

        pairs = [[query, c["text"][:512]] for c in candidates]

        with torch.no_grad():
            encoded = self.rerank_tok(
                pairs, padding=True, truncation=True, max_length=512, return_tensors="pt"
            )
            logits = self.reranker(**encoded).logits

            # Handle 0-D, 1-D, and 2-D logit shapes
            if logits.dim() == 0:
                logits = logits.unsqueeze(0)
            elif logits.dim() == 2:
                logits = logits.squeeze(-1)

            scores = torch.sigmoid(logits)
            normalized = scores.tolist()
            if isinstance(normalized, float):
                normalized = [normalized]

        scored = sorted(zip(normalized, candidates), key=lambda x: x[0], reverse=True)

        result = []
        for score, chunk in scored[:top_k]:
            chunk['rerank_score'] = float(score)
            result.append(chunk)
        return result

    # ─────────────────────────────────────────────────────────
    # MAIN ENTRY POINT
    # ─────────────────────────────────────────────────────────

    def retrieve(
        self,
        query: str,
        province_filter: Optional[str] = None,
        top_k: int = 6
    ) -> list:
        """
        Hybrid retrieval pipeline:
        1. Dense vector search  → 30 candidates (semantic match)
        2. Sparse BM25 search   → 30 candidates (keyword match)
        3. RRF fusion           → 20 fused candidates
        4. Cross-encoder rerank → top_k final results

        Returns chunks with keys: id, text, metadata, score, method, rerank_score
        """
        dense  = self._vector_search(query, top_k=30, province_filter=province_filter)
        sparse = self._bm25_search(query, top_k=30, province_filter=province_filter)
        fused  = self._rrf_fuse(dense, sparse, top_n=20)
        return self._rerank(query, fused, top_k=top_k)