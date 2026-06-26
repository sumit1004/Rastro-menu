const profiles = require('../profiles/CategoryProfiles.json');

class CategoryResolver {
  static resolve(dishCategory, dishName) {
    if (!dishCategory && !dishName) return profiles['Generic'];

    const searchStr = `${dishCategory || ''} ${dishName || ''}`.toLowerCase();

    if (searchStr.includes('burger')) return profiles['Burger'];
    if (searchStr.includes('pizza')) return profiles['Pizza'];
    if (searchStr.includes('coffee') || searchStr.includes('tea') || searchStr.includes('drink')) return profiles['Coffee'];
    if (searchStr.includes('dessert') || searchStr.includes('cake') || searchStr.includes('ice cream')) return profiles['Dessert'];
    if (searchStr.includes('bowl') || searchStr.includes('soup')) return profiles['Bowl'];
    if (searchStr.includes('plate') || searchStr.includes('pasta') || searchStr.includes('biryani')) return profiles['Plate'];

    return profiles['Generic'];
  }
}

module.exports = CategoryResolver;
