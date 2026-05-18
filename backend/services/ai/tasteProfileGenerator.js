const aiProvider = require('./aiProvider');

const generateTasteTags = async (name, description, ingredients) => {
  const prompt = `
    You are a food sensory expert. Extract 3 to 5 distinct "taste/texture" tags for the following dish.
    
    Dish Name: ${name}
    Description: ${description || 'Not specified'}
    Ingredients: ${ingredients || 'Not specified'}
    
    RULES:
    - Use single words only (e.g. Spicy, Creamy, Crunchy, Smoky, Sweet, Zesty, Umami).
    - Return ONLY a valid JSON array of strings. No markdown formatting, no backticks, no other text.
    - Example valid output: ["Spicy", "Crispy", "Tangy"]
  `;

  const rawOutput = await aiProvider.generateContent(prompt);
  
  try {
    // Try to parse the output as JSON. Clean up potential markdown formatting just in case.
    let cleanedOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const tags = JSON.parse(cleanedOutput);
    
    if (Array.isArray(tags)) {
      return tags.slice(0, 5); // Ensure max 5
    }
    return [];
  } catch (error) {
    console.error("Failed to parse taste tags JSON:", rawOutput);
    return [];
  }
};

module.exports = { generateTasteTags };
