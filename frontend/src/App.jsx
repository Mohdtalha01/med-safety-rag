import React, { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SafetyChecker from './pages/SafetyChecker.jsx';
import Patients from './pages/Patients.jsx';
import DrugKnowledge from './pages/DrugKnowledge.jsx';
import History from './pages/History.jsx';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const pages = {
    dashboard: <Dashboard onNavigate={setPage} />,
    checker:   <SafetyChecker />,
    patients:  <Patients />,
    drugs:     <DrugKnowledge />,
    history:   <History onRunCheck={() => setPage('checker')} />,
  };
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar current={page} onNavigate={setPage} />
      <main style={{ flex: 1, marginLeft: 228, minHeight: '100vh', background: 'var(--bg)' }}>
        {pages[page] || pages.dashboard}
      </main>
    </div>
  );
}
