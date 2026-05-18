const aiProvider = require('./aiProvider');

const autoFillDishInfo = async (name, ingredientsStr = '') => {
  console.log("----- AI AUTO-FILL INCOMING PAYLOAD -----");
  console.log({ name, ingredients: ingredientsStr });

  // Dynamic Keyword-based Fallback Logic
  const lowerIngredients = ingredientsStr.toLowerCase();
  const fallbackTags = ["Delicious", "Fresh"];
  if (lowerIngredients.includes("cheese")) fallbackTags.push("Cheesy");
  if (lowerIngredients.includes("chili") || lowerIngredients.includes("spicy")) fallbackTags.push("Spicy");
  if (lowerIngredients.includes("mint")) fallbackTags.push("Refreshing");
  if (lowerIngredients.includes("garlic")) fallbackTags.push("Garlicky");
  if (lowerIngredients.includes("chicken") || lowerIngredients.includes("beef")) fallbackTags.push("Savory");

  let fallbackCategory = "Main Course";
  const lowerName = name.toLowerCase();
  if (lowerName.includes("cake") || lowerName.includes("ice cream") || lowerName.includes("dessert")) fallbackCategory = "Dessert";
  if (lowerName.includes("drink") || lowerName.includes("cola") || lowerName.includes("shake")) fallbackCategory = "Beverage";
  if (lowerName.includes("soup") || lowerName.includes("salad")) fallbackCategory = "Starter";

  const fallbackResponse = {
    description: `A delicious and freshly prepared ${name}, crafted with premium ingredients for an unforgettable taste.`,
    ingredients: ingredientsStr || "Fresh ingredients, secret spices",
    calories: 450,
    category: fallbackCategory,
    taste_tags: fallbackTags.slice(0, 4)
  };

  const prompt = `
    You are a professional restaurant copywriter and food expert.
    I will provide a dish name and its ingredients. You must return a strict JSON object containing the following details.
    Do not return any markdown formatting, backticks, or extra text. JUST the JSON object.

    Dish Name: ${name}
    Ingredients: ${ingredientsStr || "Not provided"}

    Required JSON Structure:
    {
      "description": "A premium, highly attractive description of the dish (max 35 words).",
      "ingredients": "A comma-separated list of the main ingredients.",
      "calories": 450,
      "category": "The best broad menu category (e.g., Starter, Main Course, Dessert, Beverage, Fast Food)",
      "taste_tags": ["Spicy", "Crispy", "Rich"]
    }
  `;

  try {
    const rawOutput = await aiProvider.generateContent(prompt);
    console.log("----- GEMINI RAW RESPONSE -----");
    console.log(rawOutput);
    
    // Parse the JSON safely
    let cleanedOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedOutput);
    
    console.log("----- PARSED JSON -----");
    console.log(data);

    // Ensure all fields exist
    return {
      description: data.description || fallbackResponse.description,
      ingredients: data.ingredients || fallbackResponse.ingredients,
      calories: data.calories || fallbackResponse.calories,
      category: data.category || fallbackResponse.category,
      taste_tags: Array.isArray(data.taste_tags) ? data.taste_tags : (Array.isArray(data.tasteTags) ? data.tasteTags : fallbackResponse.taste_tags)
    };
  } catch (error) {
    console.log("----- FALLBACK TRIGGERED -----");
    console.log("Reason:", error.message);
    console.error("AI Generation failed. Using fallback template. Error details:", error.message);
    // Graceful fallback to prevent 500 errors
    return fallbackResponse;
  }
};

module.exports = { autoFillDishInfo };
