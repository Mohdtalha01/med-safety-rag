import json
import os
import uuid
from fastapi import APIRouter, HTTPException
from models.schemas import NewPatientRequest, Medication
from services.rag_service import rag_service
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/patients", tags=["Patients"])
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load_patients() -> List[dict]:
    with open(os.path.join(DATA_DIR, "patient_records.json")) as f:
        return json.load(f)


def _save_patients(patients: List[dict]):
    with open(os.path.join(DATA_DIR, "patient_records.json"), "w") as f:
        json.dump(patients, f, indent=2)


@router.get("/")
async def list_patients():
    """List all patients — summary view."""
    try:
        return [
            {
                "patient_id": p["patient_id"],
                "name": p["name"],
                "age": p.get("age"),
                "gender": p.get("gender"),
                "blood_group": p.get("blood_group"),
                "diagnoses": p.get("diagnoses", []),
                "allergies": p.get("allergies", []),
                "current_medications": p.get("current_medications", []),
                "renal_function": p.get("renal_function"),
                "hepatic_function": p.get("hepatic_function"),
            }
            for p in _load_patients()
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get full patient record by ID."""
    try:
        for p in _load_patients():
            if p["patient_id"] == patient_id:
                return p
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def add_patient(patient: NewPatientRequest):
    """Add a new patient."""
    try:
        patients = _load_patients()
        new_id = f"P{str(uuid.uuid4())[:6].upper()}"
        patient_dict = patient.model_dump()
        patient_dict["patient_id"] = new_id

        # Serialize nested Medication objects
        patient_dict["current_medications"] = [
            m if isinstance(m, dict) else m.model_dump()
            for m in patient_dict.get("current_medications", [])
        ]

        patients.append(patient_dict)
        _save_patients(patients)

        # Re-init RAG with new patient (rebuild index)
        rag_service.initialize()

        return {"patient_id": new_id, "message": "Patient added successfully", "patient": patient_dict}
    except Exception as e:
        logger.error(f"Add patient error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class UpdatePatientRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = None
    diagnoses: Optional[List[str]] = None
    renal_function: Optional[str] = None
    hepatic_function: Optional[str] = None
    notes: Optional[str] = None
    medical_history: Optional[List[str]] = None
    surgical_history: Optional[List[str]] = None
    family_history: Optional[List[str]] = None
    lab_results: Optional[Dict[str, Any]] = None
    vitals: Optional[Dict[str, Any]] = None


@router.put("/{patient_id}")
async def update_patient(patient_id: str, updates: UpdatePatientRequest):
    """Update a patient record (partial update)."""
    try:
        patients = _load_patients()
        for i, p in enumerate(patients):
            if p["patient_id"] == patient_id:
                update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
                patients[i].update(update_dict)
                _save_patients(patients)
                return {"message": "Patient updated", "patient": patients[i]}
        raise HTTPException(status_code=404, detail="Patient not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AddMedicationRequest(BaseModel):
    name: str
    dose: str
    frequency: str


@router.post("/{patient_id}/medications")
async def add_medication(patient_id: str, med: AddMedicationRequest):
    """Add a medication to a patient's current list."""
    try:
        patients = _load_patients()
        for i, p in enumerate(patients):
            if p["patient_id"] == patient_id:
                meds = p.get("current_medications", [])
                new_med = med.model_dump()
                meds.append(new_med)
                patients[i]["current_medications"] = meds
                _save_patients(patients)
                return {"message": "Medication added", "medications": meds}
        raise HTTPException(status_code=404, detail="Patient not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{patient_id}/medications/{med_name}")
async def remove_medication(patient_id: str, med_name: str):
    """Remove a medication from a patient's current list by name."""
    try:
        patients = _load_patients()
        for i, p in enumerate(patients):
            if p["patient_id"] == patient_id:
                meds = p.get("current_medications", [])
                meds = [m for m in meds if m.get("name", "").lower() != med_name.lower()]
                patients[i]["current_medications"] = meds
                _save_patients(patients)
                return {"message": f"Medication '{med_name}' removed", "medications": meds}
        raise HTTPException(status_code=404, detail="Patient not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient record."""
    try:
        patients = _load_patients()
        new_list = [p for p in patients if p["patient_id"] != patient_id]
        if len(new_list) == len(patients):
            raise HTTPException(status_code=404, detail="Patient not found")
        _save_patients(new_list)
        return {"message": f"Patient '{patient_id}' deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
