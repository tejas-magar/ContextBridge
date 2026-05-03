/**
 * Prompt Builder Module
 * Constructs final, token-efficient prompts by combining the compressed 
 * context summary, important files, and the user's immediate task.
 */

class PromptBuilder {
  /**
   * Builds a clean, highly structured prompt for any AI model.
   * @param {string} summary - The compressed project context summary.
   * @param {Array<string>|string} files - List of important files (or a formatted string).
   * @param {string} task - The specific task the user wants the AI to perform.
   * @returns {string} The final formatted prompt string.
   */
  buildPrompt(summary, files, task) {
    let formattedFiles = 'None specified.';
    
    if (Array.isArray(files) && files.length > 0) {
      formattedFiles = files.map(file => `- ${file}`).join('\n');
    } else if (typeof files === 'string' && files.trim() !== '') {
      formattedFiles = files;
    }

    // Using template literals to enforce the exact structure requested
    return `You are continuing a software project.

Project Summary:
${summary}

Important Files:
${formattedFiles}

Task:
${task}`;
  }
}

module.exports = new PromptBuilder();
