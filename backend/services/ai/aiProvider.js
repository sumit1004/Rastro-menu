const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIProvider {
  constructor() {
    this.providerName = 'gemini';
    
    // Do not instantiate model here, to prevent crashes on startup if key is missing.
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async generateContent(prompt) {
    if (!this.apiKey) {
      console.warn("AI Provider Warning: GEMINI_API_KEY is missing. Using fallback.");
      throw new Error("Missing API Key");
    }

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      return text;
    } catch (error) {
      console.error("AI Generation Error details:", error);
      throw error; // Bubble up to autoFillGenerator to handle fallback
    }
  }
}

module.exports = new AIProvider();
