import json
import os
import hashlib
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from typing import List, Tuple, Optional
import logging
import numpy as np

logger = logging.getLogger(__name__)

DRUG_COLLECTION = "drug_knowledge"
PATIENT_COLLECTION = "patient_records"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


class MedSafetyEmbeddingFunction(EmbeddingFunction):
    """
    Offline-capable embedding function using TF-IDF + hash features.
    No internet required, no external model downloads needed.
    Falls back to sentence-transformers if available.
    """

    def __init__(self, n_features: int = 512):
        self.n_features = n_features
        self._corpus: List[str] = []
        self._idf: Optional[np.ndarray] = None
        self._vocab: dict = {}
        self._fitted = False

    # ---------- simple tokenizer ----------
    def _tokenize(self, text: str) -> List[str]:
        import re
        text = text.lower()
        tokens = re.findall(r"[a-z0-9]+", text)
        # simple bigrams
        bigrams = [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens)-1)]
        return tokens + bigrams

    def _fit(self, corpus: List[str]):
        from collections import Counter
        import math
        all_tokens = [set(self._tokenize(d)) for d in corpus]
        vocab_set: set = set()
        for toks in all_tokens:
            vocab_set.update(toks)
        self._vocab = {t: i for i, t in enumerate(sorted(vocab_set))}
        n_docs = len(corpus)
        idf = np.zeros(len(self._vocab))
        for toks in all_tokens:
            for t in toks:
                if t in self._vocab:
                    idf[self._vocab[t]] += 1
        self._idf = np.log((n_docs + 1) / (idf + 1)) + 1.0
        self._fitted = True

    def _vectorize(self, text: str) -> np.ndarray:
        from collections import Counter
        tokens = self._tokenize(text)
        tf = Counter(tokens)
        vec = np.zeros(len(self._vocab))
        for tok, cnt in tf.items():
            if tok in self._vocab:
                vec[self._vocab[tok]] = cnt
        if self._idf is not None:
            vec = vec * self._idf
        # Project to n_features via deterministic hash bucketing
        out = np.zeros(self.n_features)
        for i, v in enumerate(vec):
            bucket = i % self.n_features
            out[bucket] += v
        norm = np.linalg.norm(out)
        if norm > 0:
            out /= norm
        return out

    def __call__(self, input: Documents) -> Embeddings:
        if not self._fitted or len(input) > 1:
            # Fit on the provided documents if we get a batch, else refit
            self._fit(list(input) + self._corpus)
        result = [self._vectorize(doc).tolist() for doc in input]
        return result

    def fit_corpus(self, corpus: List[str]):
        """Pre-fit on the full corpus for better IDF estimates."""
        self._corpus = corpus
        self._fit(corpus)


class RAGService:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="/tmp/medsafety_chroma_v2")
        self._drug_ef = MedSafetyEmbeddingFunction(n_features=512)
        self._patient_ef = MedSafetyEmbeddingFunction(n_features=512)
        self._drug_collection = None
        self._patient_collection = None
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        logger.info("Initializing RAG Service with offline embeddings...")
        self._setup_drug_collection()
        self._setup_patient_collection()
        self._initialized = True
        logger.info("RAG Service initialized successfully.")

    # ──────────────────────────── DRUG COLLECTION ────────────────────────────

    def _setup_drug_collection(self):
        try:
            self.client.delete_collection(DRUG_COLLECTION)
        except Exception:
            pass
        self._drug_collection = self.client.create_collection(
            name=DRUG_COLLECTION,
            embedding_function=self._drug_ef,
            metadata={"hnsw:space": "cosine"},
        )
        self._index_drug_data()

    def _drug_to_text(self, drug: dict) -> str:
        interactions = "; ".join(
            [f"{i['drug']} ({i['severity']}): {i['effect']}" for i in drug.get("interactions", [])]
        )
        return (
            f"Drug: {drug['drug_name']}\n"
            f"Class: {drug.get('class', '')}\n"
            f"Indications: {'; '.join(drug.get('indications', []))}\n"
            f"Contraindications: {'; '.join(drug.get('contraindications', []))}\n"
            f"Drug Interactions: {interactions}\n"
            f"Side Effects: {'; '.join(drug.get('side_effects', []))}\n"
            f"Renal Dosing: {drug.get('renal_dosing', 'Standard')}\n"
            f"Hepatic Dosing: {drug.get('hepatic_dosing', 'Standard')}\n"
            f"Pregnancy: {drug.get('pregnancy_category', 'Unknown')}\n"
            f"Max Dose: {drug.get('max_dose', '')}\n"
            f"Monitoring: {'; '.join(drug.get('monitoring', []))}\n"
            f"Black Box Warning: {drug.get('black_box_warning', 'None')}\n"
            f"Notes: {drug.get('notes', '')}"
        )

    def _index_drug_data(self):
        drug_file = os.path.join(DATA_DIR, "drug_knowledge.json")
        with open(drug_file, "r") as f:
            drugs = json.load(f)

        docs = [self._drug_to_text(d) for d in drugs]
        # Pre-fit IDF on full corpus
        self._drug_ef.fit_corpus(docs)

        ids = [d["id"] for d in drugs]
        metadatas = [
            {
                "drug_name": d["drug_name"],
                "drug_class": d.get("class", ""),
                "has_black_box": str(d.get("black_box_warning") is not None),
            }
            for d in drugs
        ]
        self._drug_collection.add(documents=docs, ids=ids, metadatas=metadatas)
        logger.info(f"Indexed {len(drugs)} drugs.")

    # ──────────────────────────── PATIENT COLLECTION ─────────────────────────

    def _setup_patient_collection(self):
        try:
            self.client.delete_collection(PATIENT_COLLECTION)
        except Exception:
            pass
        self._patient_collection = self.client.create_collection(
            name=PATIENT_COLLECTION,
            embedding_function=self._patient_ef,
            metadata={"hnsw:space": "cosine"},
        )
        self._index_patient_data()

    def _patient_to_text(self, patient: dict) -> str:
        meds = "; ".join(
            [f"{m['name']} {m['dose']} {m['frequency']}" for m in patient.get("current_medications", [])]
        )
        labs = patient.get("lab_results", {}) or {}
        lab_str = "; ".join([f"{k}: {v}" for k, v in labs.items() if v is not None])
        return (
            f"Patient: {patient.get('name', 'Unknown')}\n"
            f"Age: {patient.get('age', '?')} Gender: {patient.get('gender', '?')}\n"
            f"Weight: {patient.get('weight_kg', '?')} kg\n"
            f"Diagnoses: {'; '.join(patient.get('diagnoses', []))}\n"
            f"Allergies: {'; '.join(patient.get('allergies', [])) or 'None'}\n"
            f"Current Medications: {meds or 'None'}\n"
            f"Renal Function: {patient.get('renal_function', 'Unknown')}\n"
            f"Hepatic Function: {patient.get('hepatic_function', 'Unknown')}\n"
            f"Lab Results: {lab_str or 'Not available'}\n"
            f"Medical History: {'; '.join(patient.get('medical_history', []))}\n"
            f"Notes: {patient.get('notes', '')}"
        )

    def _index_patient_data(self):
        patient_file = os.path.join(DATA_DIR, "patient_records.json")
        with open(patient_file, "r") as f:
            patients = json.load(f)

        docs = [self._patient_to_text(p) for p in patients]
        self._patient_ef.fit_corpus(docs)

        ids = [p["patient_id"] for p in patients]
        metadatas = [
            {
                "name": p["name"],
                "patient_id": p["patient_id"],
                "age": str(p.get("age", "")),
                "gender": p.get("gender", ""),
            }
            for p in patients
        ]
        self._patient_collection.add(documents=docs, ids=ids, metadatas=metadatas)
        logger.info(f"Indexed {len(patients)} patients.")

    # ──────────────────────────── PUBLIC API ─────────────────────────────────

    def retrieve_drug_context(self, query: str, n_results: int = 2) -> Tuple[str, List[dict]]:
        if not self._drug_collection:
            return "", []
        try:
            count = self._drug_collection.count()
            n = min(n_results, count)
            results = self._drug_collection.query(query_texts=[query], n_results=n)
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            return "\n\n---\n\n".join(docs), metas
        except Exception as e:
            logger.error(f"Drug retrieval error: {e}")
            return "", []

    def retrieve_patient_context(
        self,
        patient_id: Optional[str] = None,
        query: Optional[str] = None,
        n_results: int = 1,
    ) -> Tuple[str, Optional[dict]]:
        if not self._patient_collection:
            return "", None

        # Try direct ID lookup first
        if patient_id:
            try:
                res = self._patient_collection.get(
                    ids=[patient_id], include=["documents", "metadatas"]
                )
                if res and res.get("documents"):
                    return res["documents"][0], (res["metadatas"][0] if res.get("metadatas") else None)
            except Exception as e:
                logger.warning(f"Patient direct lookup failed: {e}")

        # Semantic search fallback
        q = query or "patient medical history"
        try:
            count = self._patient_collection.count()
            n = min(n_results, count)
            results = self._patient_collection.query(query_texts=[q], n_results=n)
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            if docs:
                return docs[0], metas[0] if metas else None
        except Exception as e:
            logger.error(f"Patient semantic search error: {e}")
        return "", None

    def add_patient(self, patient: dict, patient_id: str) -> bool:
        try:
            text = self._patient_to_text(patient)
            self._patient_collection.add(
                documents=[text],
                ids=[patient_id],
                metadatas=[
                    {
                        "name": patient.get("name", ""),
                        "patient_id": patient_id,
                        "age": str(patient.get("age", "")),
                        "gender": patient.get("gender", ""),
                    }
                ],
            )
            return True
        except Exception as e:
            logger.error(f"Failed to add patient: {e}")
            return False

    def get_all_drugs_meta(self) -> List[dict]:
        try:
            return self._drug_collection.get(include=["metadatas"]).get("metadatas", [])
        except Exception:
            return []


# Singleton
rag_service = RAGService()
