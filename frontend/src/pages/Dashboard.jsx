import React, { useEffect, useState } from 'react';
import { Shield, Users, Pill, Activity, ArrowRight, AlertTriangle, Zap, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { getPatients, getDrugs, getHistory, healthCheck } from '../api.js';

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={color} />
      </div>
    </div>
  );
}

function SafetyBadge({ level }) {
  const cfg = {
    SAFE:            { c: 'var(--safe)',     bg: 'var(--safeBg)' },
    CAUTION:         { c: 'var(--caution)',  bg: 'var(--cautionBg)' },
    WARNING:         { c: 'var(--warning)',  bg: 'var(--warningBg)' },
    DANGER:          { c: 'var(--danger)',   bg: 'var(--dangerBg)' },
    CONTRAINDICATED: { c: 'var(--critical)', bg: 'var(--criticalBg)' },
  }[level] || { c: 'var(--text3)', bg: 'var(--surface)' };
  return (
    <span style={{ padding: '2px 7px', background: cfg.bg, borderRadius: 4, fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: cfg.c, letterSpacing: .5 }}>
      {level}
    </span>
  );
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ patients: '—', drugs: '—', checks: '—', online: null });
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    Promise.all([getPatients(), getDrugs(), getHistory(5), healthCheck()])
      .then(([patients, drugs, history]) => {
        setStats({ patients: patients.length, drugs: drugs.length, checks: history.length > 0 ? '...' : 0, online: true });
        setRecentHistory(history);
        // Get total count
        getHistory(200).then(h => setStats(s => ({ ...s, checks: h.length })));
      })
      .catch(() => setStats(s => ({ ...s, online: false })));
  }, []);

  const actions = [
    { label: 'Run Safety Check',  desc: 'Check a medication for a specific patient using Dual-Source RAG',   page: 'checker',  icon: Shield, primary: true },
    { label: 'Manage Patients',   desc: 'View, add, and edit patient records',                               page: 'patients', icon: Users,  primary: false },
    { label: 'Drug Database',     desc: 'Browse and search the drug safety knowledge base',                  page: 'drugs',    icon: Pill,   primary: false },
    { label: 'Check History',     desc: 'View all previous medication safety analyses',                      page: 'history',  icon: Clock,  primary: false },
  ];

  const arch = [
    { t: 'Source 1 — Drug Knowledge',   d: 'ChromaDB semantic search over drug contraindications, interactions, and dosing rules', c: 'var(--accent)' },
    { t: 'Source 2 — Patient Records',  d: 'ChromaDB lookup of patient labs, allergies, diagnoses, and current medications',      c: 'var(--safe)' },
    { t: 'Groq LLM (Free)',             d: 'LLaMA 3.1 8B via Groq API — fast inference, no cost, runs analysis on fused context',  c: 'var(--caution)' },
    { t: 'Structured Alert Extraction', d: 'Second LLM pass extracts severity-graded alerts, score, monitoring plan as JSON',     c: 'var(--warning)' },
  ];

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1080 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            padding: '3px 10px',
            background: stats.online === true ? 'var(--safeBg)' : stats.online === false ? 'var(--dangerBg)' : 'var(--surface)',
            border: `1px solid ${stats.online === true ? 'var(--safe)' : stats.online === false ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: 20, fontSize: 10, fontFamily: 'var(--mono)',
            color: stats.online === true ? 'var(--safe)' : stats.online === false ? 'var(--danger)' : 'var(--text3)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: stats.online === true ? 'pulse 2s infinite' : 'none' }} />
            {stats.online === true ? 'SYSTEM ONLINE' : stats.online === false ? 'BACKEND OFFLINE — Start the backend server' : 'CONNECTING...'}
          </div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.25, marginBottom: 10 }}>
          Medication Safety<br />
          <span style={{ color: 'var(--accent)' }}>Alert System</span>
        </h1>
        <p style={{ color: 'var(--text2)', maxWidth: 520, lineHeight: 1.7, fontSize: 14 }}>
          AI-powered clinical decision support using <strong style={{ color: 'var(--text)' }}>Dual-Source RAG</strong>.
          Checks drug safety against a patient's complete medical profile in real time.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
        <StatCard label="Patients"     value={stats.patients} icon={Users}       color="var(--accent)"  />
        <StatCard label="Drugs in KB"  value={stats.drugs}    icon={Pill}        color="var(--safe)"    />
        <StatCard label="RAG Sources"  value={2}              icon={Zap}         color="var(--caution)" sub="Drug KB + Patient records" />
        <StatCard label="Checks Run"   value={stats.checks}   icon={TrendingUp}  color="var(--warning)" />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 36 }}>
        <SectionTitle>Quick Actions</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 11 }}>
          {actions.map(({ label, desc, page, icon: Icon, primary }) => (
            <button key={page} onClick={() => onNavigate(page)} style={{
              background: primary ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'var(--surface)',
              border: primary ? 'none' : '1px solid var(--border)',
              borderRadius: 'var(--rl)', padding: '18px 16px', textAlign: 'left',
              color: 'var(--text)', cursor: 'pointer', transition: 'transform .14s, box-shadow .14s',
              boxShadow: primary ? '0 4px 18px rgba(59,130,246,.28)' : 'none',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Icon size={18} style={{ marginBottom: 10, opacity: primary ? 1 : .65 }} />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 11.5, opacity: .65, lineHeight: 1.45 }}>{desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: primary ? 'rgba(255,255,255,.75)' : 'var(--accent2)' }}>
                Open <ArrowRight size={11} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Architecture */}
        <div>
          <SectionTitle>System Architecture</SectionTitle>
          <div style={{ display: 'grid', gap: 10 }}>
            {arch.map(({ t, d, c }) => (
              <div key={t} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '13px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{t}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent History */}
        <div>
          <SectionTitle>Recent Checks</SectionTitle>
          {recentHistory.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '32px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No checks yet — run your first safety check
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentHistory.map(h => (
                <div key={h.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.drug_name} <span style={{ fontWeight: 400, color: 'var(--text3)' }}>for</span> {h.patient_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{new Date(h.timestamp).toLocaleString()}</div>
                  </div>
                  <SafetyBadge level={h.overall_safety} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text3)', letterSpacing: 1.1, marginBottom: 12, textTransform: 'uppercase' }}>{children}</div>;
}
