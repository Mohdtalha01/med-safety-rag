from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class LabResults(BaseModel):
    eGFR: Optional[float] = None
    HbA1c: Optional[float] = None
    serum_creatinine: Optional[float] = None
    potassium: Optional[float] = None
    sodium: Optional[float] = None
    ALT: Optional[float] = None
    AST: Optional[float] = None
    total_cholesterol: Optional[float] = None
    LDL: Optional[float] = None
    HDL: Optional[float] = None
    INR: Optional[float] = None
    hemoglobin: Optional[float] = None
    platelets: Optional[float] = None


class Vitals(BaseModel):
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    heart_rate: Optional[float] = None
    temperature: Optional[float] = None
    SpO2: Optional[float] = None


class Medication(BaseModel):
    name: str
    dose: str
    frequency: str


class PatientRecord(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    blood_group: Optional[str] = None
    allergies: List[str] = []
    diagnoses: List[str] = []
    current_medications: List[Medication] = []
    lab_results: Optional[LabResults] = None
    vitals: Optional[Vitals] = None
    medical_history: List[str] = []
    surgical_history: List[str] = []
    family_history: List[str] = []
    renal_function: Optional[str] = None
    hepatic_function: Optional[str] = None
    notes: Optional[str] = None


class DrugInteraction(BaseModel):
    drug: str
    severity: str
    effect: str


class DrugInfo(BaseModel):
    id: str
    drug_name: str
    drug_class: str
    indications: List[str]
    contraindications: List[str]
    interactions: List[DrugInteraction]
    side_effects: List[str]
    renal_dosing: Optional[str] = None
    hepatic_dosing: Optional[str] = None
    pregnancy_category: Optional[str] = None
    max_dose: Optional[str] = None
    monitoring: List[str] = []
    black_box_warning: Optional[str] = None
    notes: Optional[str] = None


class MedicationCheckRequest(BaseModel):
    patient_id: Optional[str] = None
    patient_data: Optional[Dict[str, Any]] = None
    drug_name: str
    dose: Optional[str] = None
    indication: Optional[str] = None
    additional_context: Optional[str] = None


class AlertLevel(BaseModel):
    level: str  # "SAFE", "CAUTION", "WARNING", "DANGER", "CONTRAINDICATED"
    color: str


class SafetyAlert(BaseModel):
    category: str
    severity: str  # "info", "low", "moderate", "high", "critical"
    message: str
    recommendation: str


class MedicationCheckResponse(BaseModel):
    patient_id: Optional[str]
    patient_name: str
    drug_name: str
    overall_safety: str  # "SAFE", "CAUTION", "WARNING", "DANGER", "CONTRAINDICATED"
    safety_score: int  # 0-100
    alerts: List[SafetyAlert]
    ai_analysis: str
    contraindicated: bool
    drug_info_found: bool
    retrieved_drug_context: Optional[str] = None
    retrieved_patient_context: Optional[str] = None
    monitoring_recommendations: List[str] = []
    alternative_suggestions: Optional[str] = None


class NewPatientRequest(BaseModel):
    name: str
    age: int
    gender: str
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    blood_group: Optional[str] = None
    allergies: List[str] = []
    diagnoses: List[str] = []
    current_medications: List[Medication] = []
    lab_results: Optional[Dict[str, Any]] = None
    vitals: Optional[Dict[str, Any]] = None
    medical_history: List[str] = []
    surgical_history: List[str] = []
    family_history: List[str] = []
    renal_function: Optional[str] = None
    hepatic_function: Optional[str] = None
    notes: Optional[str] = None
