/** Round to 2 decimal places (INR). Avoids float drift in totals. */
export function toMoneyNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Format for UI — whole rupees without ".00" when possible. */
export function formatRupee(value) {
  const n = toMoneyNumber(value);
  if (n % 1 === 0) return String(Math.trunc(n));
  return n.toFixed(2);
}

export function lineTotal(itemPrice, quantity = 1) {
  return toMoneyNumber(toMoneyNumber(itemPrice) * (Number(quantity) || 1));
}

export function sumOrderItems(items) {
  if (!items?.length) return 0;
  return toMoneyNumber(
    items.reduce((sum, item) => sum + lineTotal(item.item_price, item.quantity), 0)
  );
}
