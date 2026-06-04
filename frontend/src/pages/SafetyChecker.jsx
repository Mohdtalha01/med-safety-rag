import React, { useState, useEffect } from 'react';
import {
  Shield, Search, AlertTriangle, CheckCircle, XCircle, Info,
  ChevronDown, ChevronUp, Loader, User, Pill, FileText, Copy, Check
} from 'lucide-react';
import { checkMedicationSafety, getPatients } from '../api.js';

/* ── helpers ─────────────────────────────────────────────────── */
const SEV = {
  info:     { c: 'var(--accent)',   bg: 'var(--accentGlow)', label: 'INFO',     I: Info },
  low:      { c: 'var(--safe)',     bg: 'var(--safeBg)',     label: 'LOW',      I: CheckCircle },
  moderate: { c: 'var(--caution)', bg: 'var(--cautionBg)',  label: 'MODERATE', I: AlertTriangle },
  high:     { c: 'var(--warning)', bg: 'var(--warningBg)',  label: 'HIGH',     I: AlertTriangle },
  critical: { c: 'var(--danger)',  bg: 'var(--dangerBg)',   label: 'CRITICAL', I: XCircle },
};
const SAFETY = {
  SAFE:            { c: 'var(--safe)',     bg: 'var(--safeBg)',     I: CheckCircle,  label: 'SAFE' },
  CAUTION:         { c: 'var(--caution)', bg: 'var(--cautionBg)',  I: AlertTriangle, label: 'CAUTION' },
  WARNING:         { c: 'var(--warning)', bg: 'var(--warningBg)',  I: AlertTriangle, label: 'WARNING' },
  DANGER:          { c: 'var(--danger)',  bg: 'var(--dangerBg)',   I: XCircle,       label: 'DANGER' },
  CONTRAINDICATED: { c: 'var(--critical)','bg': 'var(--criticalBg)', I: XCircle,    label: 'CONTRAINDICATED' },
};

const QUICK = [
  { drug: 'Metformin',    dose: '500mg twice daily',  ind: 'Type 2 Diabetes',   patient: 'P001' },
  { drug: 'Lisinopril',   dose: '10mg once daily',    ind: 'Hypertension',       patient: 'P001' },
  { drug: 'Aspirin',      dose: '81mg once daily',    ind: 'Antiplatelet',       patient: 'P002' },
  { drug: 'Amoxicillin',  dose: '500mg three times',  ind: 'Bacterial infection',patient: 'P001' },
  { drug: 'Sertraline',   dose: '100mg once daily',   ind: 'Depression',         patient: 'P003' },
  { drug: 'Tramadol',     dose: '50mg as needed',     ind: 'Pain relief',        patient: 'P003' },
];

function ScoreArc({ score }) {
  const color = score >= 85 ? 'var(--safe)' : score >= 65 ? 'var(--caution)' : score >= 35 ? 'var(--warning)' : 'var(--danger)';
  const arc = (score / 100) * 251;
  return (
    <div style={{ textAlign: 'center', minWidth: 100 }}>
      <div style={{ position: 'relative', width: 92, height: 92, margin: '0 auto' }}>
        <svg width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r="38" fill="none" stroke="var(--border2)" strokeWidth="7" />
          <circle cx="46" cy="46" r="38" fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${arc} 251`} strokeLinecap="round"
            transform="rotate(-90 46 46)" style={{ transition: 'stroke-dasharray .8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color }}>{score}</span>
          <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>/100</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5, fontFamily: 'var(--mono)', letterSpacing: .5 }}>SAFETY SCORE</div>
    </div>
  );
}

function AlertCard({ a }) {
  const cfg = SEV[a.severity] || SEV.info;
  const Icon = cfg.I;
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.c}28`, borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 9, borderLeft: `3px solid ${cfg.c}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <Icon size={13} color={cfg.c} />
        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: cfg.c, letterSpacing: .5 }}>{cfg.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{a.category}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 5, lineHeight: 1.55 }}>{a.message}</p>
      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.45 }}>
        <span style={{ fontWeight: 600, color: cfg.c }}>→ </span>{a.recommendation}
      </p>
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return (
    <button onClick={copy} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 8px', borderRadius: 5, transition: 'color .15s' }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
    >
      {copied ? <Check size={12} color="var(--safe)" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: 6, letterSpacing: .4 }}>
    {children}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
  </label>
);

export default function SafetyChecker() {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient_id: '', drug_name: '', dose: '', indication: '', additional_context: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showContext, setShowContext] = useState(false);

  useEffect(() => { getPatients().then(setPatients).catch(() => {}); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fillQuick = (q) => setForm({ patient_id: q.patient, drug_name: q.drug, dose: q.dose, indication: q.ind, additional_context: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.drug_name.trim()) { setError('Drug name is required.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const payload = {
        drug_name: form.drug_name.trim(),
        dose: form.dose || null,
        indication: form.indication || null,
        additional_context: form.additional_context || null,
      };
      if (form.patient_id) payload.patient_id = form.patient_id;
      setResult(await checkMedicationSafety(payload));
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed. Check that the backend is running and GROQ_API_KEY is set.');
    } finally { setLoading(false); }
  };

  const scfg = result ? (SAFETY[result.overall_safety] || SAFETY.CAUTION) : null;

  return (
    <div style={{ padding: '36px 40px', maxWidth: 860 }}>
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 9 }}>
          <Shield size={19} color="var(--accent)" /> Medication Safety Checker
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Dual-source RAG: drug knowledge base + patient record → Groq LLM analysis</p>
      </div>

      {/* Quick test buttons */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)', letterSpacing: 1, marginBottom: 9, textTransform: 'uppercase' }}>Quick Test Cases</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {QUICK.map(q => (
            <button key={q.drug+q.patient} onClick={() => fillQuick(q)} style={{
              padding: '5px 11px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text2)', fontSize: 12, cursor: 'pointer', transition: 'all .12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
            >
              {q.drug} / {q.patient}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '24px', marginBottom: 22 }}>
          <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)', letterSpacing: 1, marginBottom: 18, textTransform: 'uppercase' }}>Check Parameters</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <Label>Patient Record</Label>
              <div style={{ position: 'relative' }}>
                <User size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <select value={form.patient_id} onChange={e => set('patient_id', e.target.value)} className="inp" style={{ paddingLeft: 32 }}>
                  <option value="">— No specific patient —</option>
                  {patients.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.age}y, {p.gender})</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label required>Drug Name</Label>
              <div style={{ position: 'relative' }}>
                <Pill size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input type="text" placeholder="e.g., Metformin, Warfarin…" value={form.drug_name} onChange={e => set('drug_name', e.target.value)} required className="inp" style={{ paddingLeft: 32 }} />
              </div>
            </div>
            <div>
              <Label>Proposed Dose</Label>
              <input type="text" placeholder="e.g., 500mg twice daily" value={form.dose} onChange={e => set('dose', e.target.value)} className="inp" />
            </div>
            <div>
              <Label>Indication</Label>
              <input type="text" placeholder="e.g., Type 2 Diabetes" value={form.indication} onChange={e => set('indication', e.target.value)} className="inp" />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <Label>Additional Clinical Context</Label>
            <textarea rows={3} placeholder="Recent events, specific concerns, co-morbidities…" value={form.additional_context} onChange={e => set('additional_context', e.target.value)} className="inp" style={{ resize: 'vertical', minHeight: 72 }} />
          </div>

          {error && (
            <div style={{ background: 'var(--dangerBg)', border: '1px solid var(--danger)', borderRadius: 'var(--r)', padding: '11px 14px', marginBottom: 14, fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px',
            background: loading ? 'var(--surface2)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            border: 'none', borderRadius: 'var(--r)', color: '#fff', fontSize: 14.5,
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: loading ? 'none' : '0 4px 14px rgba(59,130,246,.28)',
            transition: 'all .18s',
          }}>
            {loading
              ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Retrieving context & analysing…</>
              : <><Search size={15} /> Run Dual-Source Safety Analysis</>}
          </button>
        </div>
      </form>

      {/* Results */}
      {result && scfg && (
        <div className="fadeUp">
          {/* Safety Banner */}
          <div style={{ background: scfg.bg, border: `2px solid ${scfg.c}38`, borderRadius: 'var(--rl)', padding: '22px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 22 }}>
            <ScoreArc score={result.safety_score} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ padding: '4px 12px', background: `${scfg.c}22`, border: `1px solid ${scfg.c}`, borderRadius: 20, fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: scfg.c, letterSpacing: 1 }}>
                  {result.overall_safety}
                </span>
                {result.contraindicated && (
                  <span style={{ padding: '4px 12px', background: 'var(--dangerBg)', border: '1px solid var(--danger)', borderRadius: 20, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--danger)' }}>
                    ⛔ CONTRAINDICATED
                  </span>
                )}
                {!result.drug_info_found && (
                  <span style={{ padding: '4px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                    Drug not in local KB
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                {result.drug_name}
                <span style={{ fontWeight: 400, color: 'var(--text2)', fontSize: 14 }}> for </span>
                {result.patient_name}
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text3)' }}>{result.alerts.length} alert{result.alerts.length !== 1 ? 's' : ''} · {result.monitoring_recommendations?.length || 0} monitoring items</p>
            </div>
          </div>

          {/* Alerts */}
          {result.alerts.length > 0 && (
            <Card title={`Safety Alerts (${result.alerts.length})`} style={{ marginBottom: 14 }}>
              {result.alerts.map((a, i) => <AlertCard key={i} a={a} />)}
            </Card>
          )}

          {/* Monitoring */}
          {result.monitoring_recommendations?.length > 0 && (
            <Card title="Monitoring Recommendations" style={{ marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {result.monitoring_recommendations.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text2)', padding: '8px 11px', background: 'var(--bg2)', borderRadius: 6 }}>
                    <CheckCircle size={12} color="var(--safe)" style={{ flexShrink: 0, marginTop: 2 }} />{m}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Alternatives */}
          {result.alternative_suggestions && (
            <div style={{ background: 'var(--accentGlow)', border: '1px solid rgba(59,130,246,.28)', borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--accent2)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Alternatives / Suggestions</div>
              <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{result.alternative_suggestions}</p>
            </div>
          )}

          {/* Full AI Analysis */}
          <Card title="Full AI Analysis" action={<CopyBtn text={result.ai_analysis} />}
            collapsible collapsed={!showAnalysis} onToggle={() => setShowAnalysis(v => !v)} style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: 'var(--bg2)', padding: 14, borderRadius: 7, maxHeight: 480, overflowY: 'auto' }}>
              {result.ai_analysis}
            </div>
          </Card>

          {/* RAG Debug */}
          <Card title="Retrieved RAG Context (Debug)" collapsible collapsed={!showContext} onToggle={() => setShowContext(v => !v)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Source 1 — Drug Knowledge Base', text: result.retrieved_drug_context },
                { label: 'Source 2 — Patient Record',      text: result.retrieved_patient_context },
              ].map(({ label, text }) => (
                <div key={label}>
                  <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--accent2)', marginBottom: 7, letterSpacing: .5 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--bg2)', padding: 11, borderRadius: 6, maxHeight: 240, overflowY: 'auto', fontFamily: 'var(--mono)' }}>
                    {text || '—'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ title, children, style, action, collapsible, collapsed, onToggle }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '20px 22px', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsible && collapsed ? 0 : 14 }}>
        <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {action}
          {collapsible && (
            <button onClick={onToggle} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}>
              {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          )}
        </div>
      </div>
      {(!collapsible || !collapsed) && children}
    </div>
  );
}
