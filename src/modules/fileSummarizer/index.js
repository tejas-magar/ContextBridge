/**
 * File Summarizer Module
 * Extracts meaningful summaries from files without hitting AI rate limits.
 */

class FileSummarizer {
  /**
   * Generates a concise summary of the file's functionality.
   * To prevent hitting strict rate limits (like Gemini's 5 Requests/Min),
   * this version statically extracts module-level comments instead of using AI.
   * 
   * @param {string} fileName - The name or path of the file.
   * @param {string} fileContent - The content of the file to summarize.
   * @returns {Promise<Object>} JSON object containing the file name and its summary.
   */
  async summarizeFile(fileName, fileContent) {
    try {
      // Attempt to extract the first JSDoc or block comment as a quick summary
      const commentMatch = fileContent.match(/\/\*\*([\s\S]*?)\*\//);
      
      let summaryText = commentMatch 
          ? commentMatch[1].replace(/\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() 
          : 'Source code file without module-level description.';

      // Fallback: If it's a JSON file like package.json, give a generic summary
      if (fileName.endsWith('.json')) {
        summaryText = 'JSON configuration/data file.';
      }

      return {
        file: fileName,
        summary: summaryText
      };
    } catch (error) {
      console.error(`Error summarizing file ${fileName}:`, error.message);
      return {
        file: fileName,
        summary: "Error generating summary."
      };
    }
  }
}

module.exports = new FileSummarizer();
