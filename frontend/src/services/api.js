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

export const analyzeProject = async (projectPath, model) => {
  const res = await http.post('/analyze', { projectPath, model });
  return res.data;
};

export const analyzeGithub = async (repoUrl, model, branch = '', ignorePatterns = []) => {
  const res = await http.post('/analyze-github', { repoUrl, model, branch, ignorePatterns });
  return res.data;
};

export const chatQuery = async (historyId, query, model) => {
  const res = await http.post('/query', { historyId, query, model });
  return res.data;
};

export const queryProject = async (model, task, projectRoot) => {
  const res = await http.post('/query', { model, task, projectRoot });
  return res.data;
};

export const getHistory = async () => {
  const res = await http.get('/history');
  return res.data;
};

export const getHistoryEntry = async (id) => {
  const res = await http.get(`/history/${id}`);
  return res.data;
};

export const deleteHistoryEntry = async (id) => {
  const res = await http.delete(`/history/${id}`);
  return res.data;
};

export const checkHealth = async () => {
  const res = await http.get('/health');
  return res.data;
};
