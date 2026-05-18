const aiProvider = require('./aiProvider');

const generateCategory = async (name, ingredients) => {
  const prompt = `
    You are a restaurant menu organizer. Suggest the single best broad menu category for the following dish.
    
    Dish Name: ${name}
    Ingredients: ${ingredients || 'Not specified'}
    
    RULES:
    - Return ONLY the category name. No other text.
    - Use standard categories like: Starter, Main Course, Dessert, Beverage, Salad, Soup, Fast Food, Breakfast.
    - Keep it under 20 characters.
  `;

  return await aiProvider.generateContent(prompt);
};

module.exports = { generateCategory };
