/**
 * GitCloner Module — SECURITY HARDENED
 * Clones a remote Git repository to a temporary directory,
 * runs analysis, then cleans up.
 */

const { execSync } = require('child_process');
const path         = require('path');
const os           = require('os');
const fs           = require('fs');
const projectAnalyzer = require('./ProjectAnalyzer');

// ─── Allowlist of safe URL patterns ─────────────────────────────────────────
// Only allow well-formed HTTPS or SSH git URLs.
// Prevents command injection via crafted repo URLs.
const SAFE_URL_REGEX = /^(https:\/\/[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+|git@[a-zA-Z0-9.\-]+:[a-zA-Z0-9.\-_/]+\.git)$/;

// Block attempts to access local paths disguised as URLs
const BLOCKED_PATTERNS = [
  /file:\/\//i,
  /localhost/i,
  /127\.0\.0/,
  /192\.168\./,
  /10\.\d+\.\d+/,
  /\.\./,            // path traversal
  /[;&|`$(){}]/,     // shell metacharacters
];

class GitCloner {
  async analyzeRepo(repoUrl, model = 'gemini', apiKey, branch = '', ignorePatterns = []) {
    // ── Input validation ─────────────────────────────────────────────────
    if (typeof repoUrl !== 'string' || repoUrl.length > 500) {
      throw new Error('Invalid repo URL format.');
    }

    const trimmed = repoUrl.trim();

    if (!SAFE_URL_REGEX.test(trimmed)) {
      throw new Error('Repo URL must be a valid HTTPS or SSH git URL (e.g. https://github.com/owner/repo).');
    }

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error('Repo URL contains blocked characters or patterns.');
      }
    }

    // Validate branch and ignores for shell safety
    if (branch && /[\s;|&$<>\\]/.test(branch)) {
      throw new Error('Invalid characters in branch name.');
    }
    if (ignorePatterns.some(p => /[\s;|&$<>\\]/.test(p))) {
      throw new Error('Invalid characters in ignore patterns.');
    }

    // ── Safe execution (args array — no shell string interpolation) ──────
    const tempDir = path.join(os.tmpdir(), `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    console.log(`\n[GitCloner] Cloning ${trimmed} → ${tempDir}`);

    try {
      // Use array args instead of a shell string — immune to injection
      execSync('git', {
        // execSync doesn't support args array directly; use spawnSync instead
      });
    } catch (_) {}

    const { spawnSync } = require('child_process');

    try {
      const cloneArgs = ['clone', '--depth=1'];
      if (branch) {
        cloneArgs.push('--branch', branch);
      }
      cloneArgs.push(trimmed, tempDir);

      const result = spawnSync(
        'git',
        cloneArgs,
        { stdio: 'pipe', timeout: 15000, encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 } // 15s timeout, 50MB max output
      );

      if (result.status !== 0) {
        const errMsg = (result.stderr || result.error?.message || 'unknown git error').split('\n')[0];
        if (result.error && result.error.code === 'ETIMEDOUT') {
          throw new Error('Repository is too large or slow to clone (exceeded 15s timeout).');
        }
        throw new Error(`Git clone failed: ${errMsg}`);
      }

      console.log(`[GitCloner] Clone complete. Analyzing...`);

      const analysis    = await projectAnalyzer.analyze(tempDir, model, apiKey, ignorePatterns);
      analysis.projectPath = trimmed;
      analysis.isGitHub    = true;
      return analysis;

    } finally {
      this._cleanup(tempDir);
    }
  }

  _cleanup(dir) {
    try {
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`[GitCloner] Cleaned up temp dir.`);
      }
    } catch (e) {
      console.warn(`[GitCloner] Cleanup warning:`, e.message);
    }
  }
}

module.exports = new GitCloner();
