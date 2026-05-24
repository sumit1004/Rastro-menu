const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const resolveItemPrice = (dish, plateType) => {
  if (!dish) return 0;
  const base = roundMoney(dish.price);
  if (plateType === 'half') {
    const half = roundMoney(dish.half_plate_price);
    if (half > 0) return half;
    return roundMoney(base / 2);
  }
  const full = roundMoney(dish.full_plate_price);
  if (full <= 0) return base;
  // Legacy rows where full_plate_price drifted from list price (e.g. 249.96 vs 250)
  if (base > 0 && Math.abs(full - base) <= 0.05) return base;
  return full;
};

module.exports = { roundMoney, resolveItemPrice };
