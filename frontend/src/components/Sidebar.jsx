import React from 'react';
import { Shield, Users, Pill, LayoutDashboard, Activity, AlertTriangle, Clock } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'checker',   label: 'Safety Checker', icon: Shield },
  { id: 'patients',  label: 'Patients',        icon: Users },
  { id: 'drugs',     label: 'Drug Database',   icon: Pill },
  { id: 'history',   label: 'Check History',   icon: Clock },
];

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside style={{
      width: 228, background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      position: 'fixed', top: 0, left: 0, bottom: 0,
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(59,130,246,.35)',
          }}>
            <Activity size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: .3 }}>
              Med<span style={{ color: 'var(--accent)' }}>Safe</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>RAG · v1.0</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px' }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: 1.2, marginBottom: 8, paddingLeft: 8, textTransform: 'uppercase' }}>
          Navigation
        </div>
        {NAV.map(({ id, label, icon: Icon }) => {
          const on = current === id;
          return (
            <button key={id} onClick={() => onNavigate(id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 11px', marginBottom: 2, borderRadius: 7, border: 'none',
              background: on ? 'var(--accentGlow)' : 'transparent',
              color: on ? 'var(--accent2)' : 'var(--text2)',
              fontSize: 13.5, fontWeight: on ? 600 : 400,
              cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
              borderLeft: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
            }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; } }}
            >
              <Icon size={15} />{label}
            </button>
          );
        })}
      </nav>

      {/* Warning */}
      <div style={{ padding: '14px 14px 18px' }}>
        <div style={{ background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.18)', borderRadius: 8, padding: '9px 11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <AlertTriangle size={11} color="var(--danger)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--mono)', letterSpacing: .5 }}>CLINICAL USE ONLY</span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.45 }}>
            AI-assisted support tool. Always apply clinical judgment.
          </p>
        </div>
      </div>
    </aside>
  );
}
