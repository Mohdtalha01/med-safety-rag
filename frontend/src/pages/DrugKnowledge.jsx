import React, { useState, useEffect } from 'react';
import { Pill, AlertTriangle, ChevronRight, X, Search, Zap } from 'lucide-react';
import { getDrugs, getDrug, checkDrugPair } from '../api.js';

const SEV_COLOR = { major: 'var(--danger)', moderate: 'var(--warning)', minor: 'var(--caution)', contraindicated: 'var(--critical)', info: 'var(--accent)' };

const Badge = ({ text, color = 'var(--accent)' }) => (
  <span style={{ padding: '2px 8px', background: `${color}15`, border: `1px solid ${color}35`, borderRadius: 4, fontSize: 11, color, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{text}</span>
);

function DrugDetailModal({ drug, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', width: '100%', maxWidth: 700, maxHeight: '88vh', overflowY: 'auto', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 21, fontWeight: 700, marginBottom: 7 }}>{drug.drug_name}</h2>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <Badge text={drug.class} />
              {drug.black_box_warning && <Badge text="⚠ BLACK BOX" color="var(--danger)" />}
              {drug.pregnancy_category && <Badge text={`Preg: ${drug.pregnancy_category.split(' - ')[0]}`} color="var(--caution)" />}
              <Badge text={`Max: ${drug.max_dose}`} color="var(--text3)" />
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={19} /></button>
        </div>

        {drug.black_box_warning && (
          <div style={{ background: 'var(--dangerBg)', border: '2px solid var(--danger)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 5 }}>
              <AlertTriangle size={13} color="var(--danger)" />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--danger)', letterSpacing: .8 }}>BLACK BOX WARNING</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{drug.black_box_warning}</p>
          </div>
        )}

        <DrugSection title="Indications" items={drug.indications} color="var(--safe)" inline />
        <DrugSection title="Contraindications" items={drug.contraindications} color="var(--danger)" />

        <div style={{ marginBottom: 20 }}>
          <SectionHdr title="Drug Interactions" />
          {drug.interactions?.map((inter, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 13px', background: 'var(--surface)', borderRadius: 6, marginBottom: 6, borderLeft: `3px solid ${SEV_COLOR[inter.severity] || 'var(--text3)'}` }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{inter.drug}</span>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{inter.effect}</p>
              </div>
              <Badge text={inter.severity.toUpperCase()} color={SEV_COLOR[inter.severity] || 'var(--text3)'} />
            </div>
          ))}
        </div>

        <DrugSection title="Side Effects" items={drug.side_effects} color="var(--warning)" inline />
        <DrugSection title="Monitoring Required" items={drug.monitoring} color="var(--accent)" inline />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            ['Renal Dosing', drug.renal_dosing], ['Hepatic Dosing', drug.hepatic_dosing],
            ['Pregnancy', drug.pregnancy_category], ['Max Dose', drug.max_dose],
          ].filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ padding: '10px 13px', background: 'var(--surface)', borderRadius: 7 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: 3 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>{val}</div>
            </div>
          ))}
        </div>

        {drug.notes && (
          <div style={{ background: 'var(--accentGlow)', border: '1px solid rgba(59,130,246,.25)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent2)' }}>Clinical Notes: </strong>{drug.notes}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Drug-Pair Interaction Checker ─────────────────────── */
function PairChecker() {
  const [d1, setD1] = useState(''); const [d2, setD2] = useState('');
  const [result, setResult] = useState(null); const [loading, setLoading] = useState(false);
  const check = async () => {
    if (!d1.trim() || !d2.trim()) return;
    setLoading(true);
    try { setResult(await checkDrugPair(d1.trim(), d2.trim())); }
    catch (e) { setResult({ error: e.response?.data?.detail || e.message }); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '20px 22px', marginBottom: 24 }}>
      <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)', letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase', display: 'flex', gap: 7, alignItems: 'center' }}>
        <Zap size={12} /> Drug-Drug Interaction Checker
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="inp" placeholder="Drug 1 (e.g., Warfarin)" value={d1} onChange={e => setD1(e.target.value)} style={{ width: 200 }} onKeyDown={e => e.key === 'Enter' && check()} />
        <span style={{ color: 'var(--text3)', fontWeight: 700 }}>+</span>
        <input className="inp" placeholder="Drug 2 (e.g., Aspirin)" value={d2} onChange={e => setD2(e.target.value)} style={{ width: 200 }} onKeyDown={e => e.key === 'Enter' && check()} />
        <button onClick={check} disabled={loading} style={{ padding: '9px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={13} /> {loading ? 'Checking…' : 'Check'}
        </button>
      </div>
      {result && !result.error && (
        <div style={{ marginTop: 14 }}>
          {result.interactions_found === 0
            ? <div style={{ fontSize: 13, color: 'var(--safe)', display: 'flex', gap: 6, alignItems: 'center' }}>✓ No known interaction found between {result.drug1} and {result.drug2} in local KB</div>
            : result.interactions.map((inter, i) => (
                <div key={i} style={{ padding: '10px 13px', background: SEV_COLOR[inter.severity] ? `${SEV_COLOR[inter.severity]}14` : 'var(--surface)', border: `1px solid ${SEV_COLOR[inter.severity] || 'var(--border)'}30`, borderRadius: 'var(--r)', marginTop: 8, borderLeft: `3px solid ${SEV_COLOR[inter.severity] || 'var(--border)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{inter.source} ↔ {inter.target}</span>
                    <Badge text={inter.severity.toUpperCase()} color={SEV_COLOR[inter.severity] || 'var(--text3)'} />
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text2)' }}>{inter.effect}</div>
                </div>
              ))
          }
        </div>
      )}
      {result?.error && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)' }}>{result.error}</div>}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────── */
export default function DrugKnowledge() {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => { getDrugs().then(setDrugs).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearching(true);
      getDrugs(search || undefined).then(setDrugs).finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSelect = async (id) => {
    try { setSelected(await getDrug(id)); } catch {}
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 9 }}>
          <Pill size={19} color="var(--accent)" /> Drug Knowledge Base
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>{drugs.length} drugs indexed in ChromaDB — Source 1 of the dual-source RAG pipeline</p>
      </div>

      <PairChecker />

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input className="inp" placeholder="Search by drug name, class, or indication…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, maxWidth: 400 }} />
        {searching && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text3)' }}>…</span>}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--r)' }} />)}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {drugs.map(d => (
            <div key={d.id} onClick={() => handleSelect(d.id)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '13px 17px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color .13s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {d.drug_name}
                  {d.has_black_box && <Badge text="⚠ BLACK BOX" color="var(--danger)" />}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <Badge text={d.class} color="var(--text3)" />
                  {d.indications?.slice(0, 2).map(i => <Badge key={i} text={i} color="var(--accent)" />)}
                  <Badge text={`${d.interaction_count} interactions`} color="var(--warning)" />
                  <Badge text={`${d.contraindication_count} contraind.`} color="var(--danger)" />
                </div>
              </div>
              <ChevronRight size={15} color="var(--text3)" />
            </div>
          ))}
          {drugs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 14 }}>
              {search ? 'No drugs match your search' : 'No drugs loaded'}
            </div>
          )}
        </div>
      )}

      {selected && <DrugDetailModal drug={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SectionHdr({ title }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text3)', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 7 }}>{title}</div>;
}

function DrugSection({ title, items, color, inline }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionHdr title={title} />
      {inline
        ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{items.map(i => <span key={i} style={{ padding: '3px 9px', background: `${color}12`, border: `1px solid ${color}28`, borderRadius: 4, fontSize: 12, color: 'var(--text2)' }}>{i}</span>)}</div>
        : <div style={{ display: 'grid', gap: 5 }}>{items.map(i => <div key={i} style={{ padding: '7px 11px', background: 'var(--surface)', borderRadius: 5, fontSize: 13, color: 'var(--text2)', borderLeft: `2px solid ${color}` }}>{i}</div>)}</div>
      }
    </div>
  );
}
