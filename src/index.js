const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const contextBridge   = require('./ContextBridge');
const projectAnalyzer = require('./ProjectAnalyzer');
const gitCloner       = require('./GitCloner');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CORS — restrict to known frontend origins only ─────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === 'development') return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed.`));
  }
}));

app.use(express.json({ limit: '50kb' }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please wait a minute.' }
});
app.use('/analyze-github', limiter);
app.use('/query', limiter);

// ─── Path validation helper ──────────────────────────────────────────────────
const path = require('path');
const fs   = require('fs');
const os   = require('os');

function validateLocalPath(inputPath) {
  if (typeof inputPath !== 'string' || inputPath.length > 500) {
    return { valid: false, error: 'Path must be a non-empty string under 500 chars.' };
  }
  const resolved = path.resolve(inputPath);

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return { valid: false, error: 'Path must be a directory, not a file.' };
  } catch {
    return { valid: false, error: `Directory not found: ${resolved}` };
  }

  const BLOCKED_DIRS = [
    'C:\\Windows', 'C:\\Program Files', '/etc', '/proc', '/sys',
    '/usr', '/bin', '/sbin', path.join(os.homedir(), '.ssh'),
  ];
  if (BLOCKED_DIRS.some(blocked => resolved.toLowerCase().startsWith(blocked.toLowerCase()))) {
    return { valid: false, error: 'Access to system directories is not allowed.' };
  }

  return { valid: true, resolved };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ status: 'ContextBridge API running', version: '2.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Clone & analyze a GitHub repo
app.post('/analyze-github', async (req, res) => {
  try {
    const { repoUrl, model = 'gemini', branch = '', ignorePatterns = [] } = req.body;
    const apiKey = req.headers['x-api-key'];

    if (!repoUrl) {
      return res.status(400).json({ success: false, error: "Missing 'repoUrl'." });
    }
    if (!apiKey) {
      return res.status(401).json({ success: false, error: "Missing API key. Please enter your key in settings." });
    }

    const result = await gitCloner.analyzeRepo(repoUrl, model, apiKey, branch, ignorePatterns);
    res.json({ success: true, data: result });

  } catch (error) {
    console.error('[/analyze-github] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Chat query
app.post('/query', async (req, res) => {
  try {
    const { context, query, model } = req.body;
    const apiKey = req.headers['x-api-key'];

    if (!context || !query || !model) {
      return res.status(400).json({ success: false, error: "Missing 'context', 'query' or 'model'." });
    }
    if (!apiKey) {
      return res.status(401).json({ success: false, error: "Missing API key." });
    }

    // Limit query length to prevent prompt injection bloat
    if (query.length > 4000) {
      return res.status(400).json({ success: false, error: 'Query exceeds 4000 character limit.' });
    }

    const finalPrompt = `PROJECT CONTEXT:\n\n${context}\n\n---\n\nUSER QUESTION:\n${query}\n\nPlease answer the question based purely on the project context above.`;
    
    const aiConnector = require('./modules/aiConnector');
    const result = await aiConnector.sendToAI(model, finalPrompt, apiKey);

    res.json({ success: true, data: result.response });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Global error handler — never leak stack traces ─────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Export for Vercel
module.exports = app;

// Only listen if not running as a Vercel function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`ContextBridge server listening on port ${PORT}`);
    console.log(`  POST /analyze-github  → Clone & analyze GitHub repo`);
    console.log(`  POST /query           → Chat with project context`);
  });
}
