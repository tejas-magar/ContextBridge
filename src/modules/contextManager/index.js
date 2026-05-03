/**
 * Context Manager Module
 * Responsible for storing, retrieving, and managing conversation context.
 * Currently uses a local JSON file for storage, designed to be easily 
 * adaptable to a database in the future.
 */

const fs = require('fs');
const path = require('path');

class ContextManager {
  constructor() {
    // Store data in the root directory under a 'data' folder
    this.storagePath = path.resolve(__dirname, '../../../data/context.json');
    this.defaultContext = {
      projectGoal: '',
      currentProgress: '',
      keyDecisions: [],
      conversationHistory: []
    };
    
    this._ensureStorageExists();
  }

  /**
   * Internal method to ensure the JSON storage file and directory exist.
   */
  _ensureStorageExists() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.storagePath)) {
      this.saveContext(this.defaultContext);
    }
  }

  /**
   * Retrieves the full context from the JSON file.
   * @returns {Object} The current context object.
   */
  getContext() {
    try {
      const data = fs.readFileSync(this.storagePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading context:', error.message);
      return { ...this.defaultContext };
    }
  }

  /**
   * Overwrites the existing context completely.
   * @param {Object} data - The full context data to save.
   */
  saveContext(data) {
    try {
      // Merge with default schema to ensure all expected keys exist
      const fullData = { ...this.defaultContext, ...data };
      fs.writeFileSync(this.storagePath, JSON.stringify(fullData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving context:', error.message);
    }
  }

  /**
   * Updates partial parts of the context.
   * @param {Object} partialData - The partial context data to update.
   */
  updateContext(partialData) {
    try {
      const currentContext = this.getContext();
      const updatedContext = { ...currentContext, ...partialData };
      this.saveContext(updatedContext);
    } catch (error) {
      console.error('Error updating context:', error.message);
    }
  }
}

module.exports = new ContextManager();
