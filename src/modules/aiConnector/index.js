/**
 * AI Connector Module
 * Routes requests to AI providers using a waterfall fallback strategy.
 * If a model hits a quota or rate limit, it automatically tries the next one.
 */

const { OpenAI }            = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Gemini Model Waterfall ──────────────────────────────────────────────────
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-lite-latest',
];

class AIConnector {
  
  async sendToAI(model, prompt, apiKey) {
    if (!apiKey) {
      throw new Error(`Authentication required: No API key provided for ${model}. Please enter your key in settings.`);
    }

    const key = model.toLowerCase();
    
    if (key === 'openai' || key === 'chatgpt') {
      return this._sendOpenAI(prompt, apiKey);
    } else if (key === 'gemini') {
      return this._sendGemini(prompt, apiKey);
    } else if (key === 'claude') {
      throw new Error('Claude API is not yet directly implemented in the backend, use Gemini or OpenAI.');
    } else {
      throw new Error(`AI provider '${model}' is not supported.`);
    }
  }

  async _sendOpenAI(prompt, apiKey) {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    return { model: 'openai', response: response.choices[0].message.content };
  }

  async _sendGemini(prompt, apiKey) {
    const client = new GoogleGenerativeAI(apiKey);
    let lastError;

    // Try each model in the waterfall
    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`[Gemini] Trying model: ${modelName}`);
        const generativeModel = client.getGenerativeModel({ model: modelName });
        const result = await generativeModel.generateContent(prompt);
        const text   = result.response.text();
        console.log(`[Gemini] ✓ Success with ${modelName}`);
        return { model: 'gemini', response: text };

      } catch (err) {
        const is429 = err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED');
        const is503 = err.message.includes('503') || err.message.includes('overloaded') || err.message.includes('unavailable');
        const is401 = err.message.includes('400') && err.message.toLowerCase().includes('api key');

        if (is401 || err.message.includes('API key not valid')) {
          throw new Error('Invalid Gemini API Key provided.');
        }

        if (is429 || is503) {
          console.warn(`[Gemini] ✗ ${modelName} unavailable (${is429 ? 'quota' : 'overloaded'}) — trying next model…`);
          lastError = err;
          continue; 
        }

        throw err;
      }
    }

    // All models exhausted
    console.error('[Gemini] All models in the waterfall are unavailable.');
    throw new Error(
      `All Gemini models hit their quota. Try again tomorrow, or use a paid API key.\n` +
      `Last error: ${lastError?.message?.slice(0, 200)}`
    );
  }
}

module.exports = new AIConnector();
