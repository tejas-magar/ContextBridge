/**
 * Project Analyzer Module
 * Scans a project and generates a portable context document
 * that can be used with ANY AI model.
 */

const fileManager   = require('./modules/fileManager');
const fileSummarizer = require('./modules/fileSummarizer');
const aiConnector   = require('./modules/aiConnector');

class ProjectAnalyzer {
  /**
   * Scans a project directory and generates a comprehensive
   * context document (markdown) describing the entire codebase.
   * 
   * @param {string} projectPath - Absolute path to scan.
   * @param {string} model       - AI model to use for generation.
   * @returns {Promise<Object>}  - { contextDoc, fileCount, techStack, structure }
   */
  async analyze(projectPath, model = 'gemini', apiKey, ignorePatterns = []) {
    console.log(`\n[Analyzer] Scanning: ${projectPath}`);

    // 1. Scan all files
    let fileTree = fileManager.scanProject(projectPath);

    if (ignorePatterns && ignorePatterns.length > 0) {
      fileTree = fileTree.filter(f => {
        return !ignorePatterns.some(p => {
          const pattern = p.trim();
          return pattern && f.path.includes(pattern);
        });
      });
    }
    
    // Strict safety limit for public deployment
    if (fileTree.length > 500) {
      throw new Error(`Repository is too large for public deployment (${fileTree.length} files). Maximum allowed is 500 files.`);
    }

    let sourceFiles = fileTree.filter(f =>
      /\.(js|ts|jsx|tsx|json|html|css|scss|md|py|java|go|rs|rb|php|env\.example)$/i.test(f.path)
        && !f.path.includes('package-lock')
    );

    console.log(`[Analyzer] Found ${sourceFiles.length} source files.`);

    // 2. Detect tech stack
    const techStack = this._detectTechStack(fileTree);

    // 3. Smart Caching Check
    const cacheManager = require('./CacheManager');
    const projectHash = cacheManager.hashProject(sourceFiles);
    const cachedResult = cacheManager.get(projectHash);
    
    if (cachedResult) {
      console.log(`[Analyzer] Using cached context document (hash: ${projectHash})`);
      // Re-apply model in case they changed it
      cachedResult.model = model;
      return cachedResult;
    }

    // 4. Large Project Handling (Smart Selection)
    // If > 40 files, pick the most important ones to avoid token overflow
    const MAX_FILES = 40;
    const MAX_FILE_SIZE = 50 * 1024; // 50KB limit per file for summarization
    let skippedFilesCount = 0;

    if (sourceFiles.length > MAX_FILES) {
      console.log(`[Analyzer] Large project detected (${sourceFiles.length} files). Selecting top ${MAX_FILES} most relevant files...`);
      // Sort by depth (shallower files usually more architectural) and prioritize package.json / README
      sourceFiles.sort((a, b) => {
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        if (a.path.toLowerCase().includes('package.json')) return -1;
        if (b.path.toLowerCase().includes('package.json')) return 1;
        if (a.path.toLowerCase().includes('readme')) return -1;
        if (b.path.toLowerCase().includes('readme')) return 1;
        return aDepth - bDepth; // Shallower files first
      });
      skippedFilesCount = sourceFiles.length - MAX_FILES;
      sourceFiles = sourceFiles.slice(0, MAX_FILES);
    }

    // 5. Extract file summaries (Chunk-aware)
    const summaries = await Promise.all(
      sourceFiles.map(async (f) => {
        if (f.size > MAX_FILE_SIZE) {
          return { file: f.path, summary: `*File skipped from full analysis due to large size (${(f.size/1024).toFixed(1)} KB).*` };
        }
        return fileSummarizer.summarizeFile(f.path, f.content);
      })
    );

    // 6. Build content blocks
    const treeStr = fileTree // Show full tree even if we don't summarize all
      .map(f => `  ${f.path}`)
      .join('\n');

    const summaryBlock = summaries
      .map(s => `### ${s.file}\n${s.summary}`)
      .join('\n\n');

    const skipNote = skippedFilesCount > 0 
      ? `\nNote: ${skippedFilesCount} files were omitted from detailed summarization to fit within AI token limits, but the full file tree is included below.` 
      : '';

    // 7. Ask AI to write the final context document
    const prompt = `You are a senior developer. Based on the following project scan, write a comprehensive and structured "Project Context Document" in Markdown format.

This document will be used by a developer to quickly explain this project to any AI assistant (ChatGPT, Claude, Gemini, etc.) without re-explaining it from scratch every time.

The document MUST include:
1. **Project Overview** – What this project does and why it exists (1-2 paragraphs)
2. **Tech Stack** – Languages, frameworks, libraries detected
3. **Architecture** – How the system is structured (modules, layers, patterns used)
4. **Key Files & Their Purpose** – A table or list of the most important files
5. **Data Flow** – How data moves through the system step by step
6. **Key Design Decisions** – Important patterns, trade-offs, or non-obvious choices
7. **How to Use / Run** – Quick start instructions if detectable
8. **Current Status & Known Issues** – What works, what is incomplete

Make it dense, technical, and accurate. Do NOT add filler phrases. This should read like something a senior dev wrote as internal documentation.

---

PROJECT PATH: ${projectPath}
DETECTED TECH STACK: ${techStack.join(', ') || 'Unknown'} ${skipNote}

FILE STRUCTURE:
${treeStr}

FILE SUMMARIES:
${summaryBlock}
`;

    console.log(`[Analyzer] Generating context document with ${model}...`);
    const result = await aiConnector.sendToAI(model, prompt, apiKey);
    
    // 8. Token Estimate (very rough heuristic: 1 word ≈ 1.3 tokens)
    const wordCount = result.response.split(/\s+/).length;
    const tokenEstimate = Math.ceil(wordCount * 1.3);

    const finalResult = {
      contextDoc:  result.response,
      fileCount:   fileTree.length,
      techStack,
      projectPath,
      tokenEstimate,
      model,
      fileTreeJson: this._buildFileTreeJson(fileTree)
    };

    // 9. Save to Cache
    cacheManager.set(projectHash, finalResult);

    return finalResult;
  }

  _buildFileTreeJson(fileTree) {
    const root = { name: 'root', type: 'directory', children: [] };
    
    for (const file of fileTree) {
      const parts = file.path.split(/[\/\\]/);
      let currentLevel = root.children;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        
        let existingPath = currentLevel.find(item => item.name === part);
        
        if (!existingPath) {
          const newItem = {
            name: part,
            type: isFile ? 'file' : 'directory'
          };
          if (!isFile) newItem.children = [];
          currentLevel.push(newItem);
          existingPath = newItem;
        }
        
        if (!isFile) {
          currentLevel = existingPath.children;
        }
      }
    }
    return root.children;
  }

  _detectTechStack(fileTree) {
    const stack = new Set();
    const paths = fileTree.map(f => f.path.toLowerCase());
    const pkgFile = fileTree.find(f => f.path.endsWith('package.json') && !f.path.includes('node_modules'));

    if (pkgFile) {
      try {
        const pkg = JSON.parse(pkgFile.content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const knownLibs = {
          'express': 'Express.js', 'react': 'React', 'next': 'Next.js',
          'vue': 'Vue.js', 'angular': 'Angular', 'vite': 'Vite',
          '@google/generative-ai': 'Google Gemini SDK', 'openai': 'OpenAI SDK',
          'mongoose': 'MongoDB/Mongoose', 'prisma': 'Prisma ORM',
          'tailwindcss': 'Tailwind CSS', 'axios': 'Axios',
          'dotenv': 'dotenv', 'typescript': 'TypeScript',
        };
        Object.entries(knownLibs).forEach(([key, name]) => {
          if (deps[key]) stack.add(name);
        });
        stack.add('Node.js');
      } catch {}
    }
    if (paths.some(p => p.endsWith('.py')))   stack.add('Python');
    if (paths.some(p => p.endsWith('.go')))   stack.add('Go');
    if (paths.some(p => p.endsWith('.rs')))   stack.add('Rust');
    if (paths.some(p => p.endsWith('.java'))) stack.add('Java');
    if (paths.some(p => p.endsWith('.ts') || p.endsWith('.tsx'))) stack.add('TypeScript');

    return [...stack];
  }
}

module.exports = new ProjectAnalyzer();
