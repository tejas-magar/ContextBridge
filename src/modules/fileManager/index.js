/**
 * File Manager Module
 * Handles file reading, writing, and parsing for context ingestion.
 */

const fs = require('fs');
const path = require('path');

class FileManager {
  constructor() {
    this.fileTree = [];
  }

  /**
   * Reads a file and returns its content and metadata.
   * @param {string} filePath - Absolute or relative path to the file.
   * @param {string} rootPath - The root path to calculate relative paths (defaults to cwd).
   * @returns {object|null} File object with path, content, size, and lastModified.
   */
  readFile(filePath, rootPath = process.cwd()) {
    try {
      const fullPath = path.resolve(filePath);
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');

      return {
        path: relativePath,
        content: content,
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error(`Error reading file at ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Recursively scans the project directory, ignoring node_modules and hidden files.
   * @param {string} rootPath - The root directory to scan.
   * @returns {Array} Array of file objects.
   */
  scanProject(rootPath) {
    this.fileTree = []; // Reset tree before scan
    const absoluteRoot = path.resolve(rootPath);
    
    const walk = (currentPath) => {
      try {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
          // Ignore hidden files and node_modules
          if (item.startsWith('.') || item === 'node_modules') {
            continue;
          }

          const fullPath = path.join(currentPath, item);
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            walk(fullPath);
          } else if (stats.isFile()) {
            const fileData = this.readFile(fullPath, absoluteRoot);
            if (fileData) {
              this.fileTree.push(fileData);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory at ${currentPath}:`, error.message);
      }
    };

    walk(absoluteRoot);
    return this.fileTree;
  }

  /**
   * Returns the generated JSON tree of the folder structure.
   * @returns {Array} Array of file objects representing the tree.
   */
  getFileTree() {
    return this.fileTree;
  }
}

module.exports = new FileManager();
