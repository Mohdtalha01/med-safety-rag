import json
import logging
import os
from typing import Optional, Dict, Any

from services.rag_service import rag_service
from services.llm_service import llm_service
from models.schemas import MedicationCheckRequest, MedicationCheckResponse, SafetyAlert

logger = logging.getLogger(__name__)
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load_patient_by_id(patient_id: str) -> Optional[Dict]:
    """Direct JSON lookup — most reliable for demo patients."""
    try:
        with open(os.path.join(DATA_DIR, "patient_records.json")) as f:
            for p in json.load(f):
                if p["patient_id"] == patient_id:
                    return p
    except Exception as e:
        logger.error(f"JSON patient lookup error: {e}")
    return None


def _patient_to_rich_text(p: Dict) -> str:
    """Convert patient dict to rich clinical summary text for the LLM."""
    meds = "; ".join(
        [f"{m['name']} {m['dose']} {m['frequency']}" for m in p.get("current_medications", [])]
    ) or "None"
    labs = p.get("lab_results", {}) or {}
    lab_parts = [f"{k}: {v}" for k, v in labs.items() if v is not None]
    lab_str = "; ".join(lab_parts) or "Not available"
    vitals = p.get("vitals", {}) or {}
    vital_str = ""
    if vitals:
        vital_str = (
            f"BP {vitals.get('bp_systolic','?')}/{vitals.get('bp_diastolic','?')} mmHg, "
            f"HR {vitals.get('heart_rate','?')} bpm, "
            f"SpO2 {vitals.get('SpO2','?')}%"
        )

    return (
        f"Name: {p.get('name','?')} | Age: {p.get('age','?')}y | "
        f"Gender: {p.get('gender','?')} | Weight: {p.get('weight_kg','?')} kg | "
        f"Blood Group: {p.get('blood_group','?')}\n"
        f"Documented Allergies: {', '.join(p.get('allergies', [])) or 'NONE'}\n"
        f"Active Diagnoses: {'; '.join(p.get('diagnoses', []))}\n"
        f"Current Medications: {meds}\n"
        f"Renal Function: {p.get('renal_function', 'Unknown')}\n"
        f"Hepatic Function: {p.get('hepatic_function', 'Unknown')}\n"
        f"Lab Results: {lab_str}\n"
        f"Vitals: {vital_str or 'Not recorded'}\n"
        f"Medical History: {'; '.join(p.get('medical_history', []))}\n"
        f"Surgical History: {'; '.join(p.get('surgical_history', [])) or 'None'}\n"
        f"Family History: {'; '.join(p.get('family_history', [])) or 'Not available'}\n"
        f"Clinical Notes: {p.get('notes','')}"
    )


async def check_medication_safety(request: MedicationCheckRequest) -> MedicationCheckResponse:
    """
    Core Dual-Source RAG medication safety check.

    Source 1 → Drug Knowledge Base (ChromaDB semantic search)
    Source 2 → Patient Records    (ChromaDB ID lookup + semantic search)
    LLM      → Groq LLaMA / Gemma (free tier)
    """
    drug_name = request.drug_name.strip()
    patient_name = "General Patient"
    patient_text = ""

    # ── SOURCE 1: Drug Knowledge Retrieval ────────────────────────────────
    drug_query = f"{drug_name} drug safety contraindications interactions renal hepatic dosing"
    drug_context, drug_metas = rag_service.retrieve_drug_context(drug_query, n_results=2)
    drug_info_found = bool(drug_context.strip())

    if not drug_context:
        drug_context = (
            f"No specific entry for '{drug_name}' found in the local knowledge base. "
            "Apply general pharmacological principles and consult authoritative references."
        )

    # ── SOURCE 2: Patient Record Retrieval ───────────────────────────────
    if request.patient_id:
        patient_dict = _load_patient_by_id(request.patient_id)
        if patient_dict:
            patient_text = _patient_to_rich_text(patient_dict)
            patient_name = patient_dict.get("name", "Unknown")
        else:
            # ChromaDB fallback
            pt, pmeta = rag_service.retrieve_patient_context(patient_id=request.patient_id)
            if pt:
                patient_text = pt
                patient_name = (pmeta or {}).get("name", "Unknown")

    elif request.patient_data:
        patient_text = _patient_to_rich_text(request.patient_data)
        patient_name = request.patient_data.get("name", "Unknown")

    if not patient_text:
        patient_text = "No patient record provided. Analysis based on general adult population."

    # ── LLM ANALYSIS ─────────────────────────────────────────────────────
    ai_analysis = llm_service.generate_safety_analysis(
        patient_context=patient_text,
        drug_context=drug_context,
        drug_name=drug_name,
        dose=request.dose,
        indication=request.indication,
        additional_context=request.additional_context,
    )

    # ── STRUCTURED ALERT EXTRACTION ───────────────────────────────────────
    structured = llm_service.extract_structured_alerts(
        analysis_text=ai_analysis,
        drug_name=drug_name,
        patient_context=patient_text,
    )

    alerts = [
        SafetyAlert(
            category=a.get("category", "General"),
            severity=a.get("severity", "info"),
            message=a.get("message", ""),
            recommendation=a.get("recommendation", ""),
        )
        for a in structured.get("alerts", [])
    ]

    return MedicationCheckResponse(
        patient_id=request.patient_id,
        patient_name=patient_name,
        drug_name=drug_name,
        overall_safety=structured.get("overall_safety", "CAUTION"),
        safety_score=int(structured.get("safety_score", 50)),
        alerts=alerts,
        ai_analysis=ai_analysis,
        contraindicated=bool(structured.get("contraindicated", False)),
        drug_info_found=drug_info_found,
        retrieved_drug_context=drug_context[:1000] if drug_context else None,
        retrieved_patient_context=patient_text[:800] if patient_text else None,
        monitoring_recommendations=structured.get("monitoring_recommendations", []),
        alternative_suggestions=structured.get("alternative_suggestions"),
    )
