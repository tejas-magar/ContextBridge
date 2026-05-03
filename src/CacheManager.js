/**
 * CacheManager — Smart context caching
 * Hashes a project's file tree to detect changes.
 * Returns cached context docs instantly on re-scan.
 * Cache is stored in data/cache.json — never contains raw file contents.
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_FILE = path.join(__dirname, '..', 'data', 'cache.json');
const MAX_ENTRIES = 50; // LRU eviction after this

class CacheManager {
  constructor() {
    this._ensureFile();
  }

  _ensureFile() {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(CACHE_FILE)) fs.writeFileSync(CACHE_FILE, JSON.stringify({}));
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch { return {}; }
  }

  _save(data) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  }

  /**
   * Hash a list of file objects to create a project fingerprint.
   * Uses file path + size + last-modified to detect any change.
   */
  hashProject(files) {
    const fingerprint = files
      .map(f => `${f.path}:${f.size}:${f.lastModified}`)
      .sort()
      .join('|');
    return crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
  }

  /**
   * Check if a valid cache entry exists for this hash.
   * @returns {Object|null} cached result or null
   */
  get(hash) {
    const cache = this._load();
    const entry = cache[hash];
    if (!entry) return null;
    console.log(`[Cache] HIT for hash ${hash} (project: ${entry.projectName})`);
    // Update last accessed time
    entry.lastAccessed = new Date().toISOString();
    this._save(cache);
    return entry;
  }

  /**
   * Store a result in the cache.
   */
  set(hash, result) {
    const cache = this._load();

    // LRU eviction — remove oldest if over limit
    const keys = Object.keys(cache);
    if (keys.length >= MAX_ENTRIES) {
      const oldest = keys.sort((a, b) =>
        new Date(cache[a].lastAccessed || 0) - new Date(cache[b].lastAccessed || 0)
      )[0];
      delete cache[oldest];
      console.log(`[Cache] Evicted oldest entry: ${oldest}`);
    }

    cache[hash] = {
      ...result,
      hash,
      cachedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    this._save(cache);
    console.log(`[Cache] Stored result for hash ${hash}`);
  }

  /**
   * List all cache entries (metadata only, no large docs).
   */
  list() {
    const cache = this._load();
    return Object.values(cache).map(e => ({
      hash: e.hash,
      projectPath: e.projectPath,
      projectName: e.projectName,
      fileCount: e.fileCount,
      techStack: e.techStack,
      cachedAt: e.cachedAt,
      tokenEstimate: e.tokenEstimate,
    })).sort((a, b) => new Date(b.cachedAt) - new Date(a.cachedAt));
  }

  /** Remove a specific cache entry */
  delete(hash) {
    const cache = this._load();
    delete cache[hash];
    this._save(cache);
  }

  /** Clear entire cache */
  clear() {
    this._save({});
  }
}

module.exports = new CacheManager();
