import React, { useState, useEffect } from 'react';
import { GitBranch, FolderSearch, Sun, Moon, Cpu, ChevronDown, Clock, Trash2, Settings, X, Key } from 'lucide-react';
import { ScannerPage } from './pages/ScannerPage';
import { ResultPage }  from './pages/ResultPage';
import { useTheme }    from './hooks/useTheme';
import { getLocalHistory, getLocalHistoryEntry, deleteLocalHistoryEntry } from './services/api';

export default function App() {
  const { theme, toggle } = useTheme();
  const [result, setResult]   = useState(null);
  const [page, setPage]       = useState('scanner'); // 'scanner' | 'result'
  const [model, setModel]     = useState('gemini');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Settings / BYOK state
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cb_api_key') || '');

  const fetchHistory = () => {
    const data = getLocalHistory();
    setHistory(data);
  };

  useEffect(() => {
    fetchHistory();
    // Onboarding: Show settings if no API key is found
    if (!localStorage.getItem('cb_api_key')) {
      setShowSettings(true);
    }
  }, []);

  const handleResult = (data) => {
    setResult(data);
    setPage('result');
    fetchHistory(); // Refresh history list
  };

  const handleReset = () => {
    setResult(null);
    setPage('scanner');
  };

  const loadHistoryEntry = (id) => {
    const entry = getLocalHistoryEntry(id);
    if (entry) {
      setResult(entry);
      setPage('result');
    }
  };

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    deleteLocalHistoryEntry(id);
    setHistory(h => h.filter(item => item.id !== id));
    if (result && result.id === id) handleReset();
  };

  const saveSettings = () => {
    localStorage.setItem('cb_api_key', apiKey.trim());
    setShowSettings(false);
  };

  return (
    <div className="app">
      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <Settings size={16} /> API Settings
              </div>
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setShowSettings(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                ContextBridge uses a <b>Bring Your Own Key (BYOK)</b> architecture. 
                Your API key is stored locally in your browser and is only sent to the backend when analyzing a repository.
              </p>
              
              <div className="scan-label" style={{ marginBottom: 6 }}><Key size={12} style={{ display: 'inline', marginRight: 4 }}/> API Key (Gemini or OpenAI)</div>
              <input 
                type="password" 
                className="path-input" 
                style={{ width: '100%', marginBottom: 16 }}
                placeholder="sk-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn-outline" onClick={() => setShowSettings(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveSettings}>Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo">
            <GitBranch size={15} strokeWidth={2} />
          </div>
          <span className="sb-title">ContextBridge</span>
        </div>

        <nav className="sb-nav">
          <button
            className={`sb-nav-item ${page === 'scanner' ? 'active' : ''}`}
            onClick={handleReset}
          >
            <FolderSearch size={15} />
            Analyze Project
          </button>
          {result && (
            <button
              className={`sb-nav-item ${page === 'result' ? 'active' : ''}`}
              onClick={() => setPage('result')}
            >
              <span style={{ fontSize: 15 }}>📄</span>
              Current Context
            </button>
          )}
        </nav>

        <div className="sb-history-section">
          <div className="sb-history-title">
            <Clock size={12} /> Recent Scans
          </div>
          <div className="sb-history-list">
            {history.map(item => (
              <div
                key={item.id}
                className={`sb-history-item ${result?.id === item.id ? 'active' : ''}`}
                onClick={() => loadHistoryEntry(item.id)}
              >
                <div className="sb-hi-info">
                  <div className="sb-hi-name">
                    {item.isGitHub && <GitBranch size={10} style={{ display: 'inline', marginRight: 4 }} />}
                    {item.projectName}
                  </div>
                  <div className="sb-hi-meta">
                    {new Date(item.createdAt).toLocaleDateString()} • {item.fileCount} files
                  </div>
                </div>
                <button
                  className="sb-hi-delete"
                  onClick={(e) => deleteHistoryItem(e, item.id)}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {history.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '0 10px' }}>No history yet.</div>
            )}
          </div>
        </div>

        <div className="sb-bottom" style={{ borderTop: 'none', paddingBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ 
              padding: '4px 14px',
              borderRadius: '99px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              <span style={{ 
                fontSize: 12, 
                fontWeight: 700,
                background: 'linear-gradient(90deg, var(--accent), #ff5eb3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.01em'
              }}>
                By Tejas
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Header */}
        <header className="header">
          <span className="header-title">
            {page === 'scanner' ? 'Analyze Project' : 'Context Document'}
          </span>

          <div className="header-right">
            <div className="model-sel-wrap">
              <Cpu size={14} style={{ color: 'var(--accent)' }} />
              <select
                className="model-sel"
                value={model}
                onChange={e => setModel(e.target.value)}
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
              </select>
              <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
            </div>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={15} />
            </button>
            <button className="icon-btn" onClick={toggle} title="Toggle theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="content">
          {page === 'scanner' && (
            <ScannerPage onResult={handleResult} model={model} onModelChange={setModel} />
          )}
          {page === 'result' && result && (
            <ResultPage result={result} onReset={handleReset} />
          )}
        </div>
      </div>
    </div>
  );
}
