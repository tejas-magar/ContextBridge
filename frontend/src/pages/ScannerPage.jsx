import React, { useState } from 'react';
import { FolderSearch, Sparkles, FileText, GitBranch } from 'lucide-react';
import { analyzeProject, analyzeGithub } from '../services/api';

const STEPS = [
  'Scanning project files…',
  'Extracting file summaries…',
  'Generating context document…',
];

export const ScannerPage = ({ onResult, model, onModelChange }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch]   = useState('');
  const [ignores, setIgnores] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState(0);
  const [error, setError]     = useState('');

  const handleScan = async () => {
    const value = repoUrl.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    setStep(0);

    const t1 = setTimeout(() => setStep(1), 2000);
    const t2 = setTimeout(() => setStep(2), 8000);

    try {
      const ignoreArr = ignores.split(',').map(s => s.trim()).filter(Boolean);
      const data = await analyzeGithub(value, model, branch.trim(), ignoreArr);

      clearTimeout(t1); clearTimeout(t2);
      onResult(data.data);
    } catch (err) {
      clearTimeout(t1); clearTimeout(t2);
      setError(err.response?.data?.error || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setStep(0);
    }
  };

  const canSubmit = repoUrl.trim();

  // ── Loading screen ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <div className="loading-title">Cloning & analyzing repository…</div>
        <div className="loading-sub">
          Cloning the repo, scanning every file, and generating your context document. This may take up to 60 seconds.
        </div>
        <div className="loading-steps">
          {['Cloning repository…', ...STEPS.slice(1)].map((s, i) => (
            <div key={i} className={`loading-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              {i < step ? '✓' : i === step ? '…' : '○'} {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main scanner UI ─────────────────────────────────────────
  return (
    <div className="scanner-page">
      {/* Hero */}
      <div className="page-hero">
        <div className="hero-badge">
          <Sparkles size={11} /> Context Generator
        </div>
        <h1 className="hero-title">Understand any project in seconds</h1>
        <p className="hero-sub">
          Point ContextBridge at a GitHub URL. It reads every file,
          understands the architecture, and writes a portable context document you can
          drop into any AI — no re-explaining needed.
        </p>
      </div>

      {/* Scan card */}
      <div className="scan-card">
        {/* Input */}
        <div className="scan-label">Git repository URL</div>
        <div className="path-row">
          <input
            className="path-input"
            type="text"
            placeholder="e.g.  https://github.com/owner/repo"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
          <button className="btn-primary" onClick={handleScan} disabled={!canSubmit}>
            <GitBranch size={15} /> Clone & Analyze
          </button>
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
          Works with any public GitHub, GitLab, or Bitbucket URL.
          For private repos, make sure you have SSH keys configured.
        </p>

        {/* Advanced Options */}
        <div style={{ marginTop: 16 }}>
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
          >
            {showAdvanced ? '▼' : '▶'} Advanced Options
          </button>
          
          {showAdvanced && (
            <div style={{ marginTop: 12, padding: '12px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>Branch (optional)</div>
                <input
                  className="path-input"
                  style={{ width: '100%', padding: '6px 10px', fontSize: 12 }}
                  placeholder="e.g. staging, develop"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>Custom Ignore Patterns (comma separated)</div>
                <input
                  className="path-input"
                  style={{ width: '100%', padding: '6px 10px', fontSize: 12 }}
                  placeholder="e.g. tests/, assets/, .github/"
                  value={ignores}
                  onChange={e => setIgnores(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Generate with:</span>
          <select
            value={model}
            onChange={e => onModelChange(e.target.value)}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--text-1)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
          </select>
        </div>

        {error && (
          <div className="error-banner" style={{ margin: '14px 0 0' }}>
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* How it works */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          How it works
        </div>
        <div className="steps">
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-title">Clone</div>
            <div className="step-desc">
              Runs git clone --depth=1 on the URL. Works with any Git host.
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-title">Understand</div>
            <div className="step-desc">The AI analyzes the architecture, tech stack, design patterns, and key decisions in your code.</div>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-title">Export</div>
            <div className="step-desc">Get a clean Markdown document. Copy it into ChatGPT, Claude, or any other AI and start working instantly.</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.7 }}>
        <FileText size={13} style={{ display: 'inline', marginRight: 4 }} />
        Supports JS, TS, Python, Go, Rust, Java, HTML, CSS, JSON, Markdown and more.
        <code style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>node_modules</code> and build artifacts are automatically excluded.
      </div>
    </div>
  );
};
