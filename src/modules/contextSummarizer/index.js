/**
 * Context Summarizer Module
 * Compresses the full project context and file summaries into a 
 * token-efficient, prompt-friendly format.
 */

const aiConnector = require('../aiConnector');

class ContextSummarizer {
  /**
   * Compresses full context and file summaries into a shorter summary.
   * @param {Object} context - The current context (goal, progress, decisions, etc).
   * @param {Array} fileSummaries - Array of file summary objects {file, summary}.
   * @returns {Promise<Object>} JSON object containing the overall summary and important files.
   */
  async summarizeContext(context, fileSummaries) {
    const systemPrompt = `You are an expert technical architect.
Your goal is to compress the provided project context and file summaries into a highly token-efficient, prompt-friendly summary.
Preserve all important technical details, key architectural decisions, and current progress.
Also identify the most important files that are critical to understanding the core system.

Return ONLY a valid JSON object matching this schema, without any markdown formatting or extra text:
{
  "summary": "A dense, technical summary of the project state and architecture.",
  "importantFiles": ["file1.js", "file2.js"]
}`;

    const promptData = {
      projectGoal: context.projectGoal,
      currentProgress: context.currentProgress,
      keyDecisions: context.keyDecisions,
      fileSummaries: fileSummaries
    };

    const prompt = `${systemPrompt}\n\nInput Data:\n${JSON.stringify(promptData, null, 2)}`;

    try {
      const result = await aiConnector.sendRequest(prompt);
      let responseText = result.response || '{}';
      
      try {
        // Strip out markdown code blocks if the AI added them
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResponse = JSON.parse(responseText);

        return {
          summary: parsedResponse.summary || "No summary generated.",
          importantFiles: parsedResponse.importantFiles || []
        };
      } catch (parseError) {
        // Fallback to handle the current simulated responses from aiConnector
        console.warn('Could not parse AI response as JSON. Using mock fallback.');
        return {
          summary: `[Simulated Compressed Summary] Extracted core technical details. (AI output: ${responseText})`,
          importantFiles: fileSummaries.slice(0, 3).map(f => f.file) // mock identifying top files
        };
      }
    } catch (error) {
      console.error('Error generating context summary:', error.message);
      return {
        summary: "Error generating compressed context.",
        importantFiles: []
      };
    }
  }
}

module.exports = new ContextSummarizer();
