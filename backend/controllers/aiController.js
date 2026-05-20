const { generateDescription } = require('../services/ai/descriptionGenerator');
const { generateTasteTags } = require('../services/ai/tasteProfileGenerator');
const { generateCategory } = require('../services/ai/categoryGenerator');
const { autoFillDishInfo } = require('../services/ai/autoFillGenerator');
const { incrementAiUsage } = require('../utils/usageHelper');

const generateAiDescription = async (req, res) => {
  try {
    const { name, ingredients, category } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Dish name is required.' });

    const description = await generateDescription(name, ingredients, category);
    if (req.restaurant) await incrementAiUsage(req.restaurant.id);
    res.json({ success: true, data: { description } });
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ success: false, message: 'AI generation failed', details: error.message });
  }
};

const generateAiTasteTags = async (req, res) => {
  try {
    const { name, description, ingredients } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Dish name is required.' });

    const tags = await generateTasteTags(name, description, ingredients);
    if (req.restaurant) await incrementAiUsage(req.restaurant.id);
    res.json({ success: true, data: { tags } });
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ success: false, message: 'AI generation failed', details: error.message });
  }
};

const generateAiCategory = async (req, res) => {
  try {
    const { name, ingredients } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Dish name is required.' });

    const category = await generateCategory(name, ingredients);
    if (req.restaurant) await incrementAiUsage(req.restaurant.id);
    res.json({ success: true, data: { category } });
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ success: false, message: 'AI generation failed', details: error.message });
  }
};

const autoFillDish = async (req, res) => {
  try {
    console.log("Received auto-fill request for dish:", req.body.name);
    const { name, ingredients } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Dish name is required.' });

    const data = await autoFillDishInfo(name, ingredients);
    if (req.restaurant) await incrementAiUsage(req.restaurant.id);
    console.log("Auto-fill data generated successfully.");
    res.json({ success: true, data });
  } catch (error) {
    console.error("Controller Error (autoFill):", error);
    res.status(500).json({ success: false, message: 'AI generation failed', details: error.message });
  }
};

module.exports = {
  generateAiDescription,
  generateAiTasteTags,
  generateAiCategory,
  autoFillDish
};
