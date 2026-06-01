import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

export function add(a: Decimal | string, b: Decimal | string): Decimal {
  return new Decimal(a).plus(new Decimal(b));
}

export function subtract(a: Decimal | string, b: Decimal | string): Decimal {
  return new Decimal(a).minus(new Decimal(b));
}

export function multiply(a: Decimal | string, b: Decimal | string): Decimal {
  return new Decimal(a).times(new Decimal(b));
}

export function divide(a: Decimal | string, b: Decimal | string): Decimal {
  if (new Decimal(b).isZero()) throw new Error('Division by zero');
  return new Decimal(a).dividedBy(new Decimal(b));
}

export function percentage(value: Decimal | string, total: Decimal | string): Decimal {
  const tot = new Decimal(total);
  if (tot.isZero()) return new Decimal(0);
  return new Decimal(value).dividedBy(tot).times(100).toDecimalPlaces(2);
}

export function formatMoney(value: Decimal | string, currency = 'USD'): string {
  const num = new Decimal(value).toNumber();
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}
