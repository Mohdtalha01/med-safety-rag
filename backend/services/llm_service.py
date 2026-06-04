import os
import json
import logging
from groq import Groq
from typing import Optional

logger = logging.getLogger(__name__)

# Free models available on Groq (in preference order)
GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "llama3-8b-8192",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
]


class LLMService:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set. Get a free key at https://console.groq.com")
        self.client = Groq(api_key=api_key)
        self.primary_model = GROQ_MODELS[0]
        self.fallback_models = GROQ_MODELS[1:]

    def _chat(self, messages: list, max_tokens: int = 2048, temperature: float = 0.1) -> str:
        """Try primary model then fallbacks."""
        for model in [self.primary_model] + self.fallback_models:
            try:
                resp = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return resp.choices[0].message.content
            except Exception as e:
                logger.warning(f"Model {model} failed: {e}")
                continue
        raise RuntimeError("All Groq models failed. Check your GROQ_API_KEY and network.")

    def generate_safety_analysis(
        self,
        patient_context: str,
        drug_context: str,
        drug_name: str,
        dose: Optional[str],
        indication: Optional[str],
        additional_context: Optional[str],
    ) -> str:
        system_prompt = (
            "You are an expert clinical pharmacist and medication safety specialist at a major hospital. "
            "You provide evidence-based, patient-specific medication safety analyses for prescribing clinicians. "
            "Be precise, use actual lab values and patient data from the context, and be clinically actionable."
        )

        user_prompt = f"""## PATIENT MEDICAL PROFILE (from Electronic Health Record):
{patient_context}

## DRUG SAFETY KNOWLEDGE BASE (retrieved):
{drug_context}

## MEDICATION CHECK REQUEST:
- Drug: **{drug_name}**
- Proposed Dose: {dose or "Not specified"}
- Indication: {indication or "Not specified"}
- Additional Context: {additional_context or "None"}

---

Provide a comprehensive **MEDICATION SAFETY ANALYSIS** covering these sections:

### 1. OVERALL SAFETY VERDICT
State clearly: SAFE / CAUTION / WARNING / DANGER / CONTRAINDICATED — and why in one sentence.

### 2. CONTRAINDICATIONS
Any absolute or relative contraindications for THIS patient? Reference specific diagnoses, labs (e.g., eGFR, potassium, INR), or conditions.

### 3. DRUG INTERACTIONS
Check {drug_name} against every current medication listed. For each interaction: drug pair, severity (minor/moderate/major/contraindicated), mechanism, and clinical impact.

### 4. ALLERGY / CROSS-REACTIVITY
Any cross-reactivity with the patient's documented allergies?

### 5. ORGAN-SPECIFIC DOSING
- **Renal**: Is dose adjustment required based on eGFR/creatinine? State the exact dose recommendation.
- **Hepatic**: Any hepatic dosing concerns?
- **Cardiac**: Any cardiac risks (QT prolongation, hypotension, etc.)?

### 6. SPECIAL POPULATIONS
Age, pregnancy, weight-based dosing if applicable.

### 7. MONITORING PLAN
What should be monitored, at what intervals, after prescribing?

### 8. CLINICAL RECOMMENDATION
Clear, actionable recommendation: prescribe as-is / prescribe with modifications / avoid — with alternatives if needed.

Be specific. Reference this patient's actual values."""

        return self._chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=2000,
            temperature=0.1,
        )

    def extract_structured_alerts(
        self,
        analysis_text: str,
        drug_name: str,
        patient_context: str,
    ) -> dict:
        system_prompt = (
            "You are a medical data extraction system. "
            "Extract structured JSON from a medication safety analysis. "
            "Return ONLY valid JSON — no markdown fences, no preamble."
        )

        user_prompt = f"""Extract structured safety data from this analysis.

ANALYSIS TEXT:
{analysis_text[:3000]}

PATIENT SUMMARY:
{patient_context[:400]}

Return ONLY this JSON (no extra text):
{{
  "overall_safety": "SAFE|CAUTION|WARNING|DANGER|CONTRAINDICATED",
  "safety_score": <0-100 integer: 90-100=SAFE, 70-89=CAUTION, 40-69=WARNING, 10-39=DANGER, 0-9=CONTRAINDICATED>,
  "contraindicated": <true|false>,
  "alerts": [
    {{
      "category": "<Contraindication|Drug Interaction|Allergy Alert|Renal Dosing|Hepatic Dosing|Cardiac Risk|Monitoring|General>",
      "severity": "<info|low|moderate|high|critical>",
      "message": "<specific alert about this patient and drug>",
      "recommendation": "<exact action the clinician should take>"
    }}
  ],
  "monitoring_recommendations": ["<specific monitoring item>"],
  "alternative_suggestions": "<alternative drug or null>"
}}

Rules:
- Include 3-6 alerts minimum
- Be specific to the patient's actual lab values and medications
- severity mapping: info=general info, low=mild concern, moderate=watch closely, high=significant risk, critical=serious/life-threatening"""

        raw = self._chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=1200,
            temperature=0.0,
        )

        # Clean markdown fences if present
        text = raw.strip()
        if "```" in text:
            parts = text.split("```")
            for p in parts:
                p = p.strip()
                if p.startswith("json"):
                    p = p[4:].strip()
                if p.startswith("{"):
                    text = p
                    break

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON object from the text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end])
                except Exception:
                    pass
            logger.error(f"Could not parse JSON from LLM: {text[:300]}")
            return self._fallback_structured(drug_name)

    def _fallback_structured(self, drug_name: str) -> dict:
        return {
            "overall_safety": "CAUTION",
            "safety_score": 55,
            "contraindicated": False,
            "alerts": [
                {
                    "category": "General",
                    "severity": "info",
                    "message": f"Automated extraction incomplete for {drug_name}. Review the full AI analysis below.",
                    "recommendation": "Review the detailed analysis section and consult a pharmacist.",
                }
            ],
            "monitoring_recommendations": ["Review full analysis", "Consult clinical pharmacist"],
            "alternative_suggestions": None,
        }


# Singleton
llm_service = LLMService()
