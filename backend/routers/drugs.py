import json
import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/drugs", tags=["Drugs"])
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load_drugs() -> list:
    with open(os.path.join(DATA_DIR, "drug_knowledge.json")) as f:
        return json.load(f)


@router.get("/")
async def list_drugs(search: Optional[str] = Query(None, description="Search drug name or class")):
    """List all drugs, optionally filtered by name/class/indication."""
    try:
        drugs = _load_drugs()
        if search:
            q = search.lower()
            drugs = [
                d for d in drugs
                if q in d["drug_name"].lower()
                or q in d.get("class", "").lower()
                or any(q in ind.lower() for ind in d.get("indications", []))
            ]
        return [
            {
                "id": d["id"],
                "drug_name": d["drug_name"],
                "class": d.get("class", ""),
                "indications": d.get("indications", []),
                "has_black_box": d.get("black_box_warning") is not None,
                "pregnancy_category": d.get("pregnancy_category", ""),
                "interaction_count": len(d.get("interactions", [])),
                "contraindication_count": len(d.get("contraindications", [])),
            }
            for d in drugs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interactions/{drug_name}")
async def get_drug_interactions(drug_name: str):
    """Get all known interactions for a specific drug."""
    try:
        drugs = _load_drugs()
        for d in drugs:
            if d["drug_name"].lower() == drug_name.lower():
                return {
                    "drug_name": d["drug_name"],
                    "interactions": d.get("interactions", []),
                    "total": len(d.get("interactions", [])),
                }
        raise HTTPException(status_code=404, detail=f"Drug '{drug_name}' not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-pair")
async def check_drug_pair(
    drug1: str = Query(..., description="First drug name"),
    drug2: str = Query(..., description="Second drug name"),
):
    """Check interaction between two specific drugs."""
    try:
        drugs = _load_drugs()
        drug_map = {d["drug_name"].lower(): d for d in drugs}
        d1 = drug_map.get(drug1.lower())
        d2 = drug_map.get(drug2.lower())

        results = []
        # Check drug1 → drug2
        if d1:
            for inter in d1.get("interactions", []):
                if inter["drug"].lower() == drug2.lower():
                    results.append({"source": d1["drug_name"], "target": drug2, **inter})
        # Check drug2 → drug1
        if d2:
            for inter in d2.get("interactions", []):
                if inter["drug"].lower() == drug1.lower():
                    results.append({"source": d2["drug_name"], "target": drug1, **inter})

        return {
            "drug1": drug1,
            "drug2": drug2,
            "interactions_found": len(results),
            "interactions": results,
            "has_major": any(i.get("severity") in ("major", "contraindicated") for i in results),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{drug_id}")
async def get_drug(drug_id: str):
    """Get full drug details by ID or name."""
    try:
        for d in _load_drugs():
            if d["id"] == drug_id or d["drug_name"].lower() == drug_id.lower():
                return d
        raise HTTPException(status_code=404, detail=f"Drug '{drug_id}' not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
