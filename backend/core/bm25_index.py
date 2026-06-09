# ═══════════════════════════════════════════════════════════════
# backend/core/bm25_index.py
# LexAI — BM25 sparse retrieval index
# Built once from Chroma chunks, persisted alongside ChromaDB
# ═══════════════════════════════════════════════════════════════

import os
import pickle
import re
from pathlib import Path
from typing import List, Dict, Optional

from rank_bm25 import BM25Okapi


# Cache lives next to ChromaDB so a single HF dataset ships both
def _default_bm25_path() -> Path:
    chroma_path = os.getenv(
        "CHROMA_DB_PATH",
        os.path.join(os.path.dirname(__file__), "..", "chroma_db")
    )
    return Path(chroma_path).resolve() / "bm25_index.pkl"


def tokenize(text: str) -> List[str]:
    """
    Tokenizer for English + Urdu mixed content.
    Lowercases, strips punctuation, keeps Urdu Unicode range.
    """
    text = text.lower()
    text = re.sub(r"[^\w\u0600-\u06FF\u0750-\u077F]+", " ", text)
    return [t for t in text.split() if len(t) > 1]


class BM25Retriever:
    """
    Sparse keyword retrieval. Complements vector search for queries
    with exact statute numbers ("Section 302 PPC") and proper nouns.
    """

    def __init__(self, cache_path: Optional[Path] = None):
        self.bm25: Optional[BM25Okapi] = None
        self.ids: List[str] = []
        self.docs: List[str] = []
        self.metas: List[Dict] = []
        self.cache_path = cache_path or _default_bm25_path()

    # ─────────────────────────────────────────────────────────
    # BUILD / LOAD / SAVE
    # ─────────────────────────────────────────────────────────

    def build_from_chroma(self, collection, batch_size: int = 5000):
        """Pull all docs from a Chroma collection and build a BM25 index."""
        print("🔨 Building BM25 index from Chroma collection...")
        total = collection.count()
        print(f"   Total chunks: {total:,}")

        all_ids, all_docs, all_metas = [], [], []
        offset = 0

        while offset < total:
            batch = collection.get(
                limit=batch_size,
                offset=offset,
                include=["documents", "metadatas"]
            )
            all_ids.extend(batch["ids"])
            all_docs.extend(batch["documents"])
            all_metas.extend(batch["metadatas"] or [{}] * len(batch["ids"]))
            offset += batch_size
            if offset % 50000 < batch_size:
                print(f"   Fetched {min(offset, total):,} / {total:,}")

        print("   Tokenizing...")
        tokenized = [tokenize(d) for d in all_docs]

        print("   Building BM25 statistics...")
        self.bm25 = BM25Okapi(tokenized)
        self.ids, self.docs, self.metas = all_ids, all_docs, all_metas

        self._save()
        print(f"✅ BM25 index built: {len(self.ids):,} docs")

    def _save(self):
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.cache_path, "wb") as f:
            pickle.dump(
                {"bm25": self.bm25, "ids": self.ids, "docs": self.docs, "metas": self.metas},
                f, protocol=pickle.HIGHEST_PROTOCOL
            )
        size_mb = self.cache_path.stat().st_size / 1e6
        print(f"💾 BM25 index saved: {self.cache_path} ({size_mb:.0f} MB)")

    def load(self) -> bool:
        if not self.cache_path.exists():
            return False
        try:
            with open(self.cache_path, "rb") as f:
                data = pickle.load(f)
            self.bm25 = data["bm25"]
            self.ids = data["ids"]
            self.docs = data["docs"]
            self.metas = data["metas"]
            print(f"   ✅ BM25 index loaded: {len(self.ids):,} docs")
            return True
        except Exception as e:
            print(f"   ⚠️  Failed to load BM25 index: {e}")
            return False

    # ─────────────────────────────────────────────────────────
    # SEARCH
    # ─────────────────────────────────────────────────────────

    def search(
        self,
        query: str,
        top_k: int = 40,
        province_filter: Optional[str] = None
    ) -> List[Dict]:
        """
        Returns chunks in LexAI schema: {text, metadata, score, method}.
        province_filter applied post-hoc (BM25 has no native metadata filter).
        """
        if self.bm25 is None:
            return []

        tokens = tokenize(query)
        if not tokens:
            return []

        scores = self.bm25.get_scores(tokens)

        # Get more candidates if filtering, since we'll prune some
        fetch_k = top_k * 4 if (province_filter and province_filter != "All") else top_k
        top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:fetch_k]

        chunks = []
        for i in top_idx:
            meta = self.metas[i]
            if province_filter and province_filter != "All":
                if meta.get("province") != province_filter:
                    continue
            chunks.append({
                "id":       self.ids[i],
                "text":     self.docs[i],
                "metadata": meta,
                "score":    float(scores[i]),
                "method":   "bm25"
            })
            if len(chunks) >= top_k:
                break
        return chunks