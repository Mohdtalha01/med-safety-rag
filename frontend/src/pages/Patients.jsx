import React, { useState, useEffect } from 'react';
import { Users, Plus, X, ChevronRight, Activity, Pill, AlertTriangle, FlaskConical, Edit2, Trash2, PlusCircle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getPatients, getPatient, addPatient, deletePatient, addMedication, removeMedication, updatePatient } from '../api.js';

/* ── shared ─────────────────────────────────────── */
const Label = ({ c = 'var(--text3)', children }) => (
  <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: c, letterSpacing: .8, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
);
const Badge = ({ text, color = 'var(--accent)' }) => (
  <span style={{ padding: '2px 8px', background: `${color}16`, border: `1px solid ${color}38`, borderRadius: 4, fontSize: 11, color, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{text}</span>
);
const Inp = (props) => <input {...props} className="inp" style={{ ...props.style }} />;
const Sel = ({ children, ...props }) => <select {...props} className="inp">{children}</select>;

/* ── Add/Edit Patient Modal ──────────────────────── */
function PatientModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name || '',
    age: existing?.age || '',
    gender: existing?.gender || 'Male',
    blood_group: existing?.blood_group || '',
    weight_kg: existing?.weight_kg || '',
    height_cm: existing?.height_cm || '',
    diagnoses: (existing?.diagnoses || []).join(', '),
    allergies: (existing?.allergies || []).join(', '),
    medical_history: (existing?.medical_history || []).join(', '),
    surgical_history: (existing?.surgical_history || []).join(', '),
    family_history: (existing?.family_history || []).join(', '),
    renal_function: existing?.renal_function || 'Normal',
    hepatic_function: existing?.hepatic_function || 'Normal',
    notes: existing?.notes || '',
    // Labs
    eGFR: existing?.lab_results?.eGFR || '',
    HbA1c: existing?.lab_results?.HbA1c || '',
    serum_creatinine: existing?.lab_results?.serum_creatinine || '',
    potassium: existing?.lab_results?.potassium || '',
    ALT: existing?.lab_results?.ALT || '',
    INR: existing?.lab_results?.INR || '',
    // Vitals
    bp_systolic: existing?.vitals?.bp_systolic || '',
    bp_diastolic: existing?.vitals?.bp_diastolic || '',
    heart_rate: existing?.vitals?.heart_rate || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLabs, setShowLabs] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const splitCSV = s => s.split(',').map(x => x.trim()).filter(Boolean);
      const payload = {
        name: form.name, age: parseInt(form.age), gender: form.gender,
        blood_group: form.blood_group || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        diagnoses: splitCSV(form.diagnoses),
        allergies: splitCSV(form.allergies),
        medical_history: splitCSV(form.medical_history),
        surgical_history: splitCSV(form.surgical_history),
        family_history: splitCSV(form.family_history),
        renal_function: form.renal_function,
        hepatic_function: form.hepatic_function,
        notes: form.notes,
        current_medications: existing?.current_medications || [],
        lab_results: {
          eGFR: form.eGFR ? parseFloat(form.eGFR) : null,
          HbA1c: form.HbA1c ? parseFloat(form.HbA1c) : null,
          serum_creatinine: form.serum_creatinine ? parseFloat(form.serum_creatinine) : null,
          potassium: form.potassium ? parseFloat(form.potassium) : null,
          ALT: form.ALT ? parseFloat(form.ALT) : null,
          INR: form.INR ? parseFloat(form.INR) : null,
        },
        vitals: {
          bp_systolic: form.bp_systolic ? parseFloat(form.bp_systolic) : null,
          bp_diastolic: form.bp_diastolic ? parseFloat(form.bp_diastolic) : null,
          heart_rate: form.heart_rate ? parseFloat(form.heart_rate) : null,
        },
      };
      if (isEdit) await updatePatient(existing.patient_id, payload);
      else await addPatient(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save patient');
    } finally { setLoading(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', width: '100%', maxWidth: 580, maxHeight: '88vh', overflowY: 'auto', padding: 28 }}>
        <ModalHeader title={isEdit ? `Edit — ${existing.name}` : 'Add New Patient'} onClose={onClose} />
        <form onSubmit={submit}>
          {/* Basic */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 14 }}>
            <div><Label>Full Name *</Label><Inp required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Patient name" /></div>
            <div><Label>Age *</Label><Inp required type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="Years" /></div>
            <div><Label>Gender</Label><Sel value={form.gender} onChange={e => set('gender', e.target.value)}><option>Male</option><option>Female</option><option>Other</option></Sel></div>
            <div><Label>Blood Group</Label><Inp value={form.blood_group} onChange={e => set('blood_group', e.target.value)} placeholder="e.g., O+" /></div>
            <div><Label>Weight (kg)</Label><Inp type="number" step="0.1" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} placeholder="kg" /></div>
            <div><Label>Height (cm)</Label><Inp type="number" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} placeholder="cm" /></div>
          </div>
          <div style={{ marginBottom: 13 }}><Label>Diagnoses (comma-separated)</Label><Inp value={form.diagnoses} onChange={e => set('diagnoses', e.target.value)} placeholder="e.g., Type 2 Diabetes, Hypertension" /></div>
          <div style={{ marginBottom: 13 }}><Label>Allergies (comma-separated)</Label><Inp value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="e.g., Penicillin, NSAIDs" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 13 }}>
            <div><Label>Renal Function</Label>
              <Sel value={form.renal_function} onChange={e => set('renal_function', e.target.value)}>
                {['Normal','CKD Stage 1','CKD Stage 2','CKD Stage 3','CKD Stage 4','CKD Stage 5 / ESRD'].map(v => <option key={v}>{v}</option>)}
              </Sel>
            </div>
            <div><Label>Hepatic Function</Label>
              <Sel value={form.hepatic_function} onChange={e => set('hepatic_function', e.target.value)}>
                {['Normal','Mild impairment','Moderate impairment','Severe impairment'].map(v => <option key={v}>{v}</option>)}
              </Sel>
            </div>
          </div>
          <div style={{ marginBottom: 13 }}><Label>Medical History (comma-separated)</Label><Inp value={form.medical_history} onChange={e => set('medical_history', e.target.value)} /></div>

          {/* Labs collapsible */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 14 }}>
            <button type="button" onClick={() => setShowLabs(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', fontSize: 12.5 }}>
              <span>Lab Results & Vitals (optional)</span>
              {showLabs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showLabs && (
              <div style={{ marginTop: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                  {[['eGFR','mL/min'],['HbA1c','%'],['serum_creatinine','mg/dL'],['potassium','mEq/L'],['ALT','U/L'],['INR','']].map(([k,u]) => (
                    <div key={k}><Label>{k}{u ? ` (${u})` : ''}</Label><Inp type="number" step="0.01" value={form[k]} onChange={e => set(k, e.target.value)} placeholder="—" /></div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[['bp_systolic','Systolic BP'],['bp_diastolic','Diastolic BP'],['heart_rate','Heart Rate']].map(([k,l]) => (
                    <div key={k}><Label>{l}</Label><Inp type="number" value={form[k]} onChange={e => set(k, e.target.value)} placeholder="—" /></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 18 }}><Label>Clinical Notes</Label><textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} className="inp" style={{ resize: 'vertical' }} /></div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 13 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Patient'}
          </button>
        </form>
      </div>
    </Overlay>
  );
}

/* ── Add Medication Modal ────────────────────────── */
function AddMedModal({ patientId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', dose: '', frequency: '' });
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await addMedication(patientId, form); onAdded(); onClose(); }
    catch (err) { alert(err.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <Overlay onClose={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', width: 360, padding: 24 }}>
        <ModalHeader title="Add Medication" onClose={onClose} />
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}><Label>Drug Name *</Label><input required className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Lisinopril" /></div>
          <div style={{ marginBottom: 12 }}><Label>Dose *</Label><input required className="inp" value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="e.g., 10mg" /></div>
          <div style={{ marginBottom: 18 }}><Label>Frequency *</Label><input required className="inp" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} placeholder="e.g., once daily" /></div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 11, background: 'var(--accent)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Adding…' : 'Add Medication'}
          </button>
        </form>
      </div>
    </Overlay>
  );
}

/* ── Patient Detail Panel ───────────────────────── */
function PatientDetail({ id, onClose, onRefresh }) {
  const [patient, setPatient] = useState(null);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => getPatient(id).then(setPatient);
  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete patient ${patient?.name}? This cannot be undone.`)) return;
    setDeleting(true);
    await deletePatient(id).catch(() => {});
    onRefresh(); onClose();
  };

  const handleRemoveMed = async (name) => {
    await removeMedication(id, name).catch(() => {});
    load(); onRefresh();
  };

  if (!patient) return (
    <Overlay onClose={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', width: 640, padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
        <div className="skeleton" style={{ width: '100%', height: 240 }} />
      </div>
    </Overlay>
  );

  const labs = patient.lab_results || {};
  const vitals = patient.vitals || {};

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto', padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 7 }}>{patient.name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Badge text={patient.patient_id} />
              <Badge text={`${patient.age}y`} color="var(--safe)" />
              <Badge text={patient.gender} color="var(--caution)" />
              {patient.blood_group && <Badge text={patient.blood_group} color="var(--text3)" />}
              {patient.weight_kg && <Badge text={`${patient.weight_kg}kg`} color="var(--text3)" />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <IconBtn icon={Edit2} title="Edit" onClick={() => setShowEdit(true)} />
            <IconBtn icon={Trash2} title="Delete" color="var(--danger)" onClick={handleDelete} />
            <IconBtn icon={X} title="Close" onClick={onClose} />
          </div>
        </div>

        <Section icon={AlertTriangle} title="Allergies">
          {patient.allergies?.length
            ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{patient.allergies.map(a => <Badge key={a} text={a} color="var(--danger)" />)}</div>
            : <span style={{ fontSize: 13, color: 'var(--text3)' }}>None documented</span>}
        </Section>

        <Section icon={Activity} title="Active Diagnoses">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{patient.diagnoses?.map(d => <Badge key={d} text={d} color="var(--warning)" />)}</div>
        </Section>

        <Section icon={Pill} title="Current Medications">
          <div style={{ marginBottom: 8 }}>
            {patient.current_medications?.length
              ? patient.current_medications.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                    <div><span style={{ fontWeight: 600 }}>{m.name}</span> <span style={{ color: 'var(--text3)' }}>{m.dose} — {m.frequency}</span></div>
                    <button onClick={() => handleRemoveMed(m.name)} title="Remove" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px 5px', borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                    ><MinusCircle size={14} /></button>
                  </div>
                ))
              : <div style={{ fontSize: 13, color: 'var(--text3)' }}>No medications listed</div>}
          </div>
          <button onClick={() => setShowAddMed(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--accentGlow)', border: '1px dashed var(--accent)', borderRadius: 6, color: 'var(--accent2)', fontSize: 12.5, cursor: 'pointer' }}>
            <PlusCircle size={13} /> Add Medication
          </button>
        </Section>

        <Section icon={FlaskConical} title="Lab Results">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Object.entries(labs).filter(([, v]) => v !== null).map(([k, v]) => (
              <div key={k} style={{ padding: '9px 11px', background: 'var(--surface)', borderRadius: 7 }}>
                <div style={{ fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: 2 }}>{k}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          {Object.keys(vitals).length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {vitals.bp_systolic && <VitalChip label="BP" value={`${vitals.bp_systolic}/${vitals.bp_diastolic}`} unit="mmHg" />}
              {vitals.heart_rate && <VitalChip label="HR" value={vitals.heart_rate} unit="bpm" />}
              {vitals.SpO2 && <VitalChip label="SpO₂" value={vitals.SpO2} unit="%" />}
            </div>
          )}
        </Section>

        {patient.notes && (
          <div style={{ background: 'var(--accentGlow)', border: '1px solid rgba(59,130,246,.25)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent2)' }}>Clinical Notes: </strong>{patient.notes}
          </div>
        )}

        {showAddMed && <AddMedModal patientId={id} onClose={() => setShowAddMed(false)} onAdded={() => { load(); onRefresh(); }} />}
        {showEdit && <PatientModal existing={patient} onClose={() => setShowEdit(false)} onSaved={() => { load(); onRefresh(); }} />}
      </div>
    </Overlay>
  );
}

/* ── Main Page ───────────────────────────────────── */
export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => getPatients().then(setPatients).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = patients.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.diagnoses?.some(d => d.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: '36px 40px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
            <Users size={19} color="var(--accent)" /> Patient Records
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{patients.length} patients · click to view full record</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
          <Plus size={15} /> Add Patient
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input className="inp" placeholder="Search by name or diagnosis…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 9 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--r)' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 9 }}>
          {filtered.map(p => (
            <div key={p.patient_id} onClick={() => setSelectedId(p.patient_id)} style={{
              background: 'var(--surface)', border: `1px solid ${selectedId === p.patient_id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--r)', padding: '14px 18px', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'border-color .14s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = selectedId === p.patient_id ? 'var(--accent)' : 'var(--border)'}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {p.name} <Badge text={p.patient_id} />
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <Badge text={`${p.age}y · ${p.gender}`} color="var(--text3)" />
                  {p.diagnoses?.slice(0, 2).map(d => <Badge key={d} text={d} color="var(--caution)" />)}
                  {p.allergies?.length > 0 && <Badge text={`⚠ ${p.allergies.length} allerg${p.allergies.length > 1 ? 'ies' : 'y'}`} color="var(--danger)" />}
                  {p.current_medications?.length > 0 && <Badge text={`${p.current_medications.length} med${p.current_medications.length > 1 ? 's' : ''}`} color="var(--accent)" />}
                </div>
              </div>
              <ChevronRight size={15} color="var(--text3)" />
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 14 }}>
              {search ? 'No patients match your search' : 'No patients yet'}
            </div>
          )}
        </div>
      )}

      {selectedId && <PatientDetail id={selectedId} onClose={() => setSelectedId(null)} onRefresh={load} />}
      {showAdd && <PatientModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

/* ── Small helpers ───────────────────────────────── */
function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <Icon size={13} color="var(--accent)" />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text3)', letterSpacing: .8, textTransform: 'uppercase' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function IconBtn({ icon: Icon, title, color = 'var(--text3)', onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: '5px', borderRadius: 5, display: 'flex' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    ><Icon size={16} /></button>
  );
}

function VitalChip({ label, value, unit }) {
  return (
    <div style={{ padding: '6px 11px', background: 'var(--surface)', borderRadius: 6, fontSize: 12 }}>
      <span style={{ color: 'var(--text3)', marginRight: 5 }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{value}</span>
      <span style={{ color: 'var(--text3)', marginLeft: 3, fontSize: 10 }}>{unit}</span>
    </div>
  );
}

function Overlay({ onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={18} /></button>
    </div>
  );
}
