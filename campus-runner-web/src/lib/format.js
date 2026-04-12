export function formatAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

export function getInitial(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase() || '?';
}
