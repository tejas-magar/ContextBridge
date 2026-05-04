import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 2 min — AI generation takes time
});

// Inject API key into every request
http.interceptors.request.use(config => {
  const apiKey = localStorage.getItem('cb_api_key');
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});

export const analyzeGithub = async (repoUrl, model, branch = '', ignorePatterns = []) => {
  const res = await http.post('/analyze-github', { repoUrl, model, branch, ignorePatterns });
  if (res.data.success) {
    saveToLocalHistory(res.data.data);
  }
  return res.data;
};

export const chatQuery = async (context, query, model) => {
  const res = await http.post('/query', { context, query, model });
  return res.data;
};

// ─── Local History Logic ─────────────────────────────────────────────────────

const HISTORY_KEY = 'cb_scan_history';

function deriveName(projectPath) {
  if (!projectPath) return 'Unknown Project';
  const gitMatch = projectPath.match(/\/([^/]+?)(\.git)?$/);
  if (gitMatch) return gitMatch[1];
  return projectPath.split('/').pop() || projectPath;
}

export const saveToLocalHistory = (result) => {
  const history = getLocalHistory();
  
  // Create a new entry
  const entry = {
    id: `h_${Date.now()}`,
    projectName: deriveName(result.projectPath),
    projectPath: result.projectPath,
    isGitHub: true,
    fileCount: result.fileCount,
    techStack: result.techStack || [],
    tokenEstimate: result.tokenEstimate,
    contextDoc: result.contextDoc,
    fileTreeJson: result.fileTreeJson,
    model: result.model || 'gemini',
    createdAt: new Date().toISOString(),
  };

  // Prepend and cap
  history.unshift(entry);
  if (history.length > 20) history.splice(20);
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return entry;
};

export const getLocalHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
};

export const getLocalHistoryEntry = (id) => {
  return getLocalHistory().find(e => e.id === id) || null;
};

export const deleteLocalHistoryEntry = (id) => {
  const history = getLocalHistory().filter(e => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const checkHealth = async () => {
  const res = await http.get('/health');
  return res.data;
};
