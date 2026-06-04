import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MedSafety RAG System...")
    try:
        from services.rag_service import rag_service
        rag_service.initialize()
        logger.info("RAG service initialized ✓")
    except Exception as e:
        logger.error(f"RAG init failed: {e}")
        raise
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="MedSafe RAG API",
    description="Personalised Medication Safety Alert System — Dual-Source RAG",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import safety, patients, drugs, history
app.include_router(safety.router)
app.include_router(patients.router)
app.include_router(drugs.router)
app.include_router(history.router)


@app.get("/")
async def root():
    return {
        "system": "MedSafe RAG",
        "description": "Personalised Medication Safety Alert System using Dual-Source RAG",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "MedSafe RAG API"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
