import React, { useState } from 'react';
import { Copy, Check, Download, RotateCcw, FileText, Code2, Layers, MessageSquare, FolderTree, ChevronRight, ChevronDown, Send, Loader2 } from 'lucide-react';
import { chatQuery } from '../services/api';

// Very fast Markdown → JSX renderer
const renderMd = (text) => {
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# '))   { out.push(<h1 key={i}>{ri(line.slice(2))}</h1>); i++; continue; }
    if (line.startsWith('## '))  { out.push(<h2 key={i}>{ri(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('### ')) { out.push(<h3 key={i}>{ri(line.slice(4))}</h3>); i++; continue; }
    if (line.trim() === '---')   { out.push(<hr key={i} />); i++; continue; }
    if (line.trim() === '')      { out.push(<br key={i} />); i++; continue; }
    // Table
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].match(/^\|[-\s|]+\|$/)) {
          const cells = lines[i].split('|').filter(c => c.trim() !== '');
          rows.push(cells);
        }
        i++;
      }
      const [header, ...body] = rows;
      out.push(
        <table key={`t${i}`}>
          <thead><tr>{header?.map((c,j) => <th key={j}>{ri(c.trim())}</th>)}</tr></thead>
          <tbody>{body.map((r,j) => <tr key={j}>{r.map((c,k) => <td key={k}>{ri(c.trim())}</td>)}</tr>)}</tbody>
        </table>
      );
      continue;
    }
    // Bullet list
    if (line.match(/^(\s*[-*]|\s*\d+\.)\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^(\s*[-*]|\s*\d+\.)\s/)) {
        items.push(<li key={i}>{ri(lines[i].replace(/^(\s*[-*]|\s*\d+\.)\s/, ''))}</li>);
        i++;
      }
      out.push(<ul key={`ul${i}`}>{items}</ul>);
      continue;
    }
    // Blockquote
    if (line.startsWith('> ')) { out.push(<blockquote key={i}>{ri(line.slice(2))}</blockquote>); i++; continue; }
    out.push(<p key={i}>{ri(line)}</p>);
    i++;
  }
  return out;
};

// Inline: bold, code, italic
const ri = (text) => {
  if (!text) return text;
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`'))   return <code key={i}>{p.slice(1,-1)}</code>;
    if (p.startsWith('*') && p.endsWith('*'))   return <em key={i}>{p.slice(1,-1)}</em>;
    return p;
  });
};

const FileTreeNode = ({ node, level = 0 }) => {
  const [expanded, setExpanded] = useState(level < 1);
  const isDir = node.type === 'directory';

  return (
    <div style={{ paddingLeft: level * 16, fontFamily: 'JetBrains Mono', fontSize: 13, lineHeight: '1.6' }}>
      <div 
        onClick={() => isDir && setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', cursor: isDir ? 'pointer' : 'default', color: isDir ? 'var(--text-1)' : 'var(--text-2)', padding: '2px 0', gap: 6 }}
      >
        {isDir ? (
          <span style={{ color: 'var(--text-3)' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span style={{ width: 14, display: 'inline-block' }} />
        )}
        <span style={{ color: isDir ? 'var(--accent)' : 'inherit' }}>
          {isDir ? '📁' : '📄'} {node.name}
        </span>
      </div>
      {isDir && expanded && node.children && (
        <div>
          {node.children.map((child, i) => (
            <FileTreeNode key={i} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ResultPage = ({ result, onReset }) => {
  const [tab, setTab]       = useState('preview'); // 'preview' | 'explorer' | 'chat' | 'raw' | 'prompts'
  const [copied, setCopied] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const query = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setChatLoading(true);

    try {
      const res = await chatQuery(result.contextDoc, query, result.model || 'gemini');
      setMessages(prev => [...prev, { role: 'ai', content: res.data }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${err.response?.data?.error || err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };
  const copy = () => {
    navigator.clipboard.writeText(result.contextDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([result.contextDoc], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'project-context.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const PROMPTS = [
    {
      icon: '🤖',
      title: 'ChatGPT Prompt',
      desc: 'Optimized for OpenAI models. Uses standard Markdown.',
      build: () => `You are an expert developer. Read the following project context and use it to answer my questions:\n\n# Project Context\n\n${result.contextDoc}`,
    },
    {
      icon: '🎯',
      title: 'Claude System Prompt',
      desc: 'Optimized phrasing for Anthropic models. Uses XML tags for context boundaries.',
      build: () => `<project_context>\n${result.contextDoc}\n</project_context>\n\nYou have been given full context about this project above. Answer questions accurately based on this context.`,
    },
    {
      icon: '✨',
      title: 'Gemini Prompt',
      desc: 'Direct and structured context for Gemini models.',
      build: () => `Project Context provided below. Please base all your answers on this architecture and codebase structure:\n\n---\n\n${result.contextDoc}`,
    },
    {
      icon: '⚡',
      title: 'Quick Start (Compressed)',
      desc: 'A shorter summary for models with tight context windows or lower quotas.',
      build: () => `PROJECT CONTEXT:\n${result.contextDoc.slice(0, 3000)}...\n\n[Context truncated for token limit. Ask me for details on any specific part.]`,
    },
  ];

  const copyPrompt = (build) => {
    navigator.clipboard.writeText(build());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="result-page">
      {/* Toolbar */}
      <div className="result-toolbar">
        <div className="result-meta">
          <div className="meta-chip">
            <Layers size={12} />
            <span><b>{result.fileCount}</b> files</span>
          </div>
          {result.tokenEstimate && (
            <div className="meta-chip" style={{ color: result.tokenEstimate > 100000 ? 'var(--amber)' : 'inherit' }}>
              <span>~<b>{(result.tokenEstimate / 1000).toFixed(1)}k</b> tokens</span>
            </div>
          )}
          {result.techStack?.slice(0,3).map(t => (
            <div key={t} className="meta-chip"><b>{t}</b></div>
          ))}
        </div>
        <div className="result-actions">
          <button className="btn-outline" onClick={onReset}>
            <RotateCcw size={13} /> New scan
          </button>
          <button className="btn-outline" onClick={download}>
            <Download size={13} /> Download .md
          </button>
          <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={copy}>
            {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy context</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="result-tabs">
        <button className={`result-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
          <FileText size={13} style={{ marginRight: 5, display: 'inline' }} />Preview
        </button>
        {result.fileTreeJson && (
          <button className={`result-tab ${tab === 'explorer' ? 'active' : ''}`} onClick={() => setTab('explorer')}>
            <FolderTree size={13} style={{ marginRight: 5, display: 'inline' }} />Explorer
          </button>
        )}
        <button className={`result-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          <MessageSquare size={13} style={{ marginRight: 5, display: 'inline' }} />Chat
        </button>
        <button className={`result-tab ${tab === 'raw' ? 'active' : ''}`} onClick={() => setTab('raw')}>
          <Code2 size={13} style={{ marginRight: 5, display: 'inline' }} />Raw Markdown
        </button>
        <button className={`result-tab ${tab === 'prompts' ? 'active' : ''}`} onClick={() => setTab('prompts')}>
          ✨ Prompts
        </button>
      </div>

      {/* Tab content */}
      {tab === 'preview' && (
        <div className="doc-view">
          <div className="doc-inner">
            {renderMd(result.contextDoc)}
          </div>
        </div>
      )}

      {tab === 'explorer' && result.fileTreeJson && (
        <div className="doc-view" style={{ padding: '24px 32px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderTree size={18} /> File Explorer
          </div>
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            {result.fileTreeJson.map((node, i) => (
              <FileTreeNode key={i} node={node} />
            ))}
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="doc-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', marginTop: 40 }}>
                <MessageSquare size={32} style={{ opacity: 0.5, marginBottom: 16 }} />
                <h3>Ask questions about this codebase</h3>
                <p style={{ maxWidth: 400, margin: '8px auto', lineHeight: 1.5 }}>
                  The AI has read all {result.fileCount} source files. Ask it to explain the architecture, find where authentication is handled, or write a test for a specific component.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ 
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-1)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-1)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    padding: '12px 16px',
                    borderRadius: 8,
                    borderBottomRightRadius: msg.role === 'user' ? 2 : 8,
                    borderTopLeftRadius: msg.role === 'ai' ? 2 : 8,
                  }}>
                    {msg.role === 'ai' ? renderMd(msg.content) : msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ alignSelf: 'flex-start', padding: 16, color: 'var(--text-3)' }}>
                    <Loader2 size={16} className="spin" style={{ display: 'inline', marginRight: 8 }} />
                    Thinking...
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ padding: '16px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}>
            <form onSubmit={handleChat} style={{ display: 'flex', gap: 8 }}>
              <input
                className="path-input"
                style={{ flex: 1 }}
                placeholder="Ask a question..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button className="btn-primary" type="submit" disabled={chatLoading || !chatInput.trim()}>
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'raw' && (
        <div className="raw-view">
          <textarea
            className="raw-area"
            readOnly
            value={result.contextDoc}
          />
        </div>
      )}

      {tab === 'prompts' && (
        <div className="prompt-builder">
          <div className="pb-inner">
            <div className="pb-title">Ready-to-use Prompts</div>
            <div className="pb-desc">
              Click any template to copy it to your clipboard. Paste it as the first message
              (or system prompt) in any AI assistant — it will instantly understand your project.
            </div>
            {PROMPTS.map((p, i) => (
              <div key={i} className="pb-card" onClick={() => copyPrompt(p.build)}>
                <div className="pb-card-icon" style={{ background: 'var(--accent-bg)' }}>{p.icon}</div>
                <div>
                  <div className="pb-card-title">{p.title}</div>
                  <div className="pb-card-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
