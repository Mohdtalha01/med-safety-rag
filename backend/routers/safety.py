from fastapi import APIRouter, HTTPException
from models.schemas import MedicationCheckRequest, MedicationCheckResponse
from services.safety_checker import check_medication_safety
from routers.history import record_check
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/safety", tags=["Medication Safety"])


@router.post("/check", response_model=MedicationCheckResponse)
async def check_medication(request: MedicationCheckRequest):
    """
    Dual-Source RAG medication safety check.
    
    Retrieves from:
    - Source 1: Drug safety knowledge base (ChromaDB)  
    - Source 2: Patient medical records (ChromaDB)
    
    Then generates a comprehensive analysis via Groq LLM (free tier).
    """
    try:
        result = await check_medication_safety(request)
        # Persist to history (non-blocking)
        try:
            record_check(result.model_dump())
        except Exception:
            pass
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Safety check error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Safety analysis failed: {str(e)}")
