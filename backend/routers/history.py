"""
Session-based check history stored in a JSON file.
In production, replace with a proper database.
"""
import json
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/history", tags=["History"])

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "check_history.json")


def _load_history() -> List[dict]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE) as f:
            return json.load(f)
    except Exception:
        return []


def _save_history(history: List[dict]):
    with open(HISTORY_FILE, "w") as f:
        json.dump(history[-200:], f, indent=2)  # Keep last 200 entries


def record_check(result: dict):
    """Called by safety router after each check."""
    try:
        history = _load_history()
        entry = {
            "id": f"H{len(history)+1:04d}",
            "timestamp": datetime.utcnow().isoformat(),
            "patient_id": result.get("patient_id"),
            "patient_name": result.get("patient_name"),
            "drug_name": result.get("drug_name"),
            "overall_safety": result.get("overall_safety"),
            "safety_score": result.get("safety_score"),
            "contraindicated": result.get("contraindicated"),
            "alert_count": len(result.get("alerts", [])),
        }
        history.append(entry)
        _save_history(history)
    except Exception as e:
        logger.error(f"Failed to record history: {e}")


@router.get("/")
async def get_history(limit: int = 50):
    """Get recent medication check history."""
    history = _load_history()
    return list(reversed(history[-limit:]))


@router.delete("/")
async def clear_history():
    """Clear all check history."""
    _save_history([])
    return {"message": "History cleared"}
