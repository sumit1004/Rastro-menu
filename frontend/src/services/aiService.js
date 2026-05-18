import api from './api';

const generateDescription = async (name, ingredients, category) => {
  const response = await api.post('/ai/generate-description', { name, ingredients, category });
  if (response.data && response.data.success) {
    return response.data.data.description;
  }
  throw new Error(response.data?.message || 'Generation failed');
};

const generateTasteTags = async (name, description, ingredients) => {
  const response = await api.post('/ai/generate-taste-tags', { name, description, ingredients });
  if (response.data && response.data.success) {
    return response.data.data.tags;
  }
  throw new Error(response.data?.message || 'Generation failed');
};

const detectCategory = async (name, ingredients) => {
  const response = await api.post('/ai/detect-category', { name, ingredients });
  if (response.data && response.data.success) {
    return response.data.data.category;
  }
  throw new Error(response.data?.message || 'Generation failed');
};

const autoFill = async (name, ingredients) => {
  const response = await api.post('/ai/auto-fill', { name, ingredients });
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Generation failed');
};

const aiService = {
  generateDescription,
  generateTasteTags,
  detectCategory,
  autoFill
};

export default aiService;
