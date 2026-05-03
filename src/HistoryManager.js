/**
 * HistoryManager — Persistent session history
 * Saves every generated context doc with metadata.
 * Never stores raw file contents — only the final context document.
 */

const fs   = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');
const MAX_HISTORY  = 20;

class HistoryManager {
  constructor() {
    this._ensureFile();
  }

  _ensureFile() {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    } catch { return []; }
  }

  _save(data) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
  }

  /** Derive a human-friendly project name from path or URL */
  _deriveName(projectPath) {
    if (!projectPath) return 'Unknown Project';
    // For git URLs: extract repo name
    const gitMatch = projectPath.match(/\/([^/]+?)(\.git)?$/);
    if (gitMatch) return gitMatch[1];
    // For file paths: use last folder name
    return path.basename(projectPath) || projectPath;
  }

  /**
   * Save a new history entry.
   */
  push(result) {
    const history = this._load();

    const entry = {
      id: `h_${Date.now()}`,
      projectName: this._deriveName(result.projectPath),
      projectPath: result.projectPath,
      isGitHub: result.isGitHub || false,
      fileCount: result.fileCount,
      techStack: result.techStack || [],
      tokenEstimate: result.tokenEstimate,
      contextDoc: result.contextDoc,
      model: result.model || 'gemini',
      createdAt: new Date().toISOString(),
    };

    // Prepend (newest first) and cap at MAX_HISTORY
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);

    this._save(history);
    console.log(`[History] Saved: ${entry.projectName} (${entry.id})`);
    return entry;
  }

  /** List all history entries (returns full objects including contextDoc) */
  list() {
    return this._load();
  }

  /** Get a single entry by ID */
  getById(id) {
    return this._load().find(e => e.id === id) || null;
  }

  /** Delete a single history entry */
  delete(id) {
    const history = this._load().filter(e => e.id !== id);
    this._save(history);
  }

  /** Clear all history */
  clear() {
    this._save([]);
  }
}

module.exports = new HistoryManager();
