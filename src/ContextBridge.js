const contextManager = require('./modules/contextManager');
const fileManager = require('./modules/fileManager');
const fileSummarizer = require('./modules/fileSummarizer');
const contextSummarizer = require('./modules/contextSummarizer');
const promptBuilder = require('./modules/promptBuilder');
const aiConnector = require('./modules/aiConnector');

class ContextBridgeCore {
  /**
   * Orchestrates the full AI switching and context injection workflow.
   * @param {string} model - The target AI model ('openai', 'gemini', etc.).
   * @param {string} task - The user's query or task.
   * @param {string} projectRoot - The path to the project to analyze (defaults to cwd).
   * @returns {Promise<Object>} An object containing the AI response and updated context.
   */
  async switchAI(model, task, projectRoot = process.cwd(), apiKey) {
    try {
      console.log(`\n[ContextBridge] Initiating switch to model: '${model}'`);

      // 1. Get current context
      console.log(`[ContextBridge] Retrieving project context...`);
      const currentContext = contextManager.getContext();

      // 2. Get file summaries
      console.log(`[ContextBridge] Scanning project at ${projectRoot}...`);
      const fileTree = fileManager.scanProject(projectRoot);
      
      // Filter out binary/irrelevant files to save tokens and processing time
      const filesToSummarize = fileTree.filter(f => 
        /\.(js|json|html|css|md|txt)$/i.test(f.path)
      );
      
      console.log(`[ContextBridge] Generating summaries for ${filesToSummarize.length} source files...`);
      const summaryPromises = filesToSummarize.map(fileObj => 
        fileSummarizer.summarizeFile(fileObj.path, fileObj.content)
      );
      const fileSummaries = await Promise.all(summaryPromises);

      // 3. Summarize context
      console.log(`[ContextBridge] Compressing global context and file summaries...`);
      const compressedContext = await contextSummarizer.summarizeContext(currentContext, fileSummaries);

      // 4. Build prompt
      console.log(`[ContextBridge] Constructing optimized AI prompt...`);
      const finalPrompt = promptBuilder.buildPrompt(
        compressedContext.summary, 
        compressedContext.importantFiles, 
        task
      );

      // 5. Send to selected AI
      console.log(`[ContextBridge] Dispatching task to ${model}...`);
      const aiResponse = await aiConnector.sendToAI(model, finalPrompt, apiKey);

      // 6. Store response
      console.log(`[ContextBridge] Updating conversation history...`);
      const updatedHistory = [...(currentContext.conversationHistory || [])];
      updatedHistory.push({
        timestamp: new Date().toISOString(),
        model: model,
        task: task,
        response: aiResponse.response
      });
      
      contextManager.updateContext({ conversationHistory: updatedHistory });

      console.log(`[ContextBridge] Workflow completed successfully.\n`);
      
      return {
        response: aiResponse.response,
        context: contextManager.getContext()
      };

    } catch (error) {
      console.error(`[ContextBridge] Workflow Error:`, error.message);
      throw error;
    }
  }
}

module.exports = new ContextBridgeCore();
