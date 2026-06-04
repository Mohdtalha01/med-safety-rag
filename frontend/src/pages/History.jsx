import React, { useState, useEffect } from 'react';
import { Clock, Trash2, RefreshCw, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { getHistory, clearHistory } from '../api.js';

const SAFETY_CFG = {
  SAFE:            { c: 'var(--safe)',     bg: 'var(--safeBg)' },
  CAUTION:         { c: 'var(--caution)', bg: 'var(--cautionBg)' },
  WARNING:         { c: 'var(--warning)', bg: 'var(--warningBg)' },
  DANGER:          { c: 'var(--danger)',  bg: 'var(--dangerBg)' },
  CONTRAINDICATED: { c: 'var(--critical)','bg': 'var(--criticalBg)' },
};

function SafetyPill({ level }) {
  const cfg = SAFETY_CFG[level] || { c: 'var(--text3)', bg: 'var(--surface)' };
  return (
    <span style={{ padding: '2px 9px', background: cfg.bg, borderRadius: 20, fontSize: 10.5, fontFamily: 'var(--mono)', fontWeight: 700, color: cfg.c, letterSpacing: .5 }}>
      {level || '—'}
    </span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 85 ? 'var(--safe)' : score >= 65 ? 'var(--caution)' : score >= 35 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color, fontWeight: 600 }}>{score}</span>
    </div>
  );
}

function StatsRow({ history }) {
  const counts = history.reduce((acc, h) => { acc[h.overall_safety] = (acc[h.overall_safety] || 0) + 1; return acc; }, {});
  const avgScore = history.length ? Math.round(history.reduce((s, h) => s + h.safety_score, 0) / history.length) : 0;
  const dangerous = (counts['DANGER'] || 0) + (counts['CONTRAINDICATED'] || 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
      {[
        { label: 'Total Checks', value: history.length, color: 'var(--accent)' },
        { label: 'Avg Safety Score', value: avgScore, color: 'var(--text)' },
        { label: 'Safe', value: counts['SAFE'] || 0, color: 'var(--safe)' },
        { label: 'Cautioned', value: (counts['CAUTION'] || 0) + (counts['WARNING'] || 0), color: 'var(--caution)' },
        { label: 'Danger / Contraind.', value: dangerous, color: 'var(--danger)' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color }}>{value}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

export default function History({ onRunCheck }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [sortAsc, setSortAsc] = useState(false);

  const load = () => { setLoading(true); getHistory(200).then(setHistory).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleClear = async () => {
    if (!window.confirm('Clear all check history?')) return;
    await clearHistory();
    load();
  };

  const LEVELS = ['ALL', 'SAFE', 'CAUTION', 'WARNING', 'DANGER', 'CONTRAINDICATED'];

  const filtered = history
    .filter(h => filter === 'ALL' || h.overall_safety === filter)
    .sort((a, b) => sortAsc ? new Date(a.timestamp) - new Date(b.timestamp) : new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div style={{ padding: '36px 40px', maxWidth: 920 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Clock size={19} color="var(--accent)" /> Check History
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{history.length} medication safety checks recorded</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={btnStyle('var(--surface)', 'var(--border)', 'var(--text2)')} title="Refresh">
            <RefreshCw size={14} />
          </button>
          {history.length > 0 && (
            <button onClick={handleClear} style={btnStyle('var(--dangerBg)', 'var(--danger)', 'var(--danger)')}>
              <Trash2 size={14} /> Clear
            </button>
          )}
          <button onClick={onRunCheck} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <Shield size={14} /> New Check
          </button>
        </div>
      </div>

      {!loading && history.length > 0 && <StatsRow history={history} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {LEVELS.map(l => {
          const cfg = SAFETY_CFG[l] || { c: 'var(--text2)', bg: 'var(--surface)' };
          const active = filter === l;
          return (
            <button key={l} onClick={() => setFilter(l)} style={{
              padding: '4px 12px', border: `1px solid ${active ? (l === 'ALL' ? 'var(--accent)' : cfg.c) : 'var(--border)'}`,
              borderRadius: 20, background: active ? (l === 'ALL' ? 'var(--accentGlow)' : cfg.bg) : 'transparent',
              color: active ? (l === 'ALL' ? 'var(--accent)' : cfg.c) : 'var(--text3)',
              fontSize: 11.5, fontFamily: 'var(--mono)', fontWeight: active ? 700 : 400, cursor: 'pointer',
            }}>{l}</button>
          );
        })}
        <button onClick={() => setSortAsc(v => !v)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, ...btnStyle('var(--surface)', 'var(--border)', 'var(--text3)') }}>
          {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {sortAsc ? 'Oldest first' : 'Newest first'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 58, borderRadius: 'var(--r)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          {history.length === 0
            ? <><p style={{ fontSize: 15, marginBottom: 10 }}>No checks recorded yet</p><button onClick={onRunCheck} style={{ padding: '9px 18px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Run your first check</button></>
            : <p>No checks with level "{filter}"</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 7 }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 120px 80px 60px', gap: 12, padding: '7px 14px', fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)', letterSpacing: .5, borderBottom: '1px solid var(--border)' }}>
            <span>#</span><span>DRUG</span><span>PATIENT</span><span>VERDICT</span><span>SCORE</span><span>ALERTS</span>
          </div>
          {filtered.map((h, idx) => (
            <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 120px 80px 60px', gap: 12, padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)', alignItems: 'center', fontSize: 13 }}>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', fontSize: 11 }}>{h.id}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{h.drug_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(h.timestamp).toLocaleString()}</div>
              </div>
              <span style={{ color: 'var(--text2)' }}>{h.patient_name || '—'}</span>
              <SafetyPill level={h.overall_safety} />
              <ScoreBar score={h.safety_score || 0} />
              <span style={{ fontFamily: 'var(--mono)', color: h.alert_count > 0 ? 'var(--caution)' : 'var(--text3)', fontWeight: 600 }}>{h.alert_count ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg, border, color) => ({
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '8px 12px', background: bg,
  border: `1px solid ${border}`, borderRadius: 'var(--r)',
  color, fontSize: 13, cursor: 'pointer',
});
