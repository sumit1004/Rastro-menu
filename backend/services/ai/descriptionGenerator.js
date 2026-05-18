const aiProvider = require('./aiProvider');

const generateDescription = async (name, ingredients, category) => {
  const prompt = `
    You are a professional restaurant copywriter. 
    Write a highly attractive, premium, and concise description for the following dish.
    
    Dish Name: ${name}
    Ingredients: ${ingredients || 'Not specified'}
    Category: ${category || 'Not specified'}
    
    RULES:
    - MAXIMUM 35 words.
    - Focus on emotional/sensory words (e.g. rich, crisp, smoky, vibrant).
    - Avoid repetitive wording.
    - Do NOT use emojis.
    - Do NOT use robotic or overly exaggerated marketing fluff.
    - Just return the description text, nothing else.
  `;

  return await aiProvider.generateContent(prompt);
};

module.exports = { generateDescription };
