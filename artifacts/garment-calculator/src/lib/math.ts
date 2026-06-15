export function decimalToFraction(decimal: number, denominator: number = 16): string {
  if (isNaN(decimal)) return '';
  const isNegative = decimal < 0;
  const absDecimal = Math.abs(decimal);
  const whole = Math.floor(absDecimal);
  const fraction = absDecimal - whole;
  const numerator = Math.round(fraction * denominator);
  
  const prefix = isNegative ? '-' : '';

  if (numerator === 0) return prefix + (whole > 0 ? `${whole}` : '0');
  if (numerator === denominator) return prefix + `${whole + 1}`;
  
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(numerator, denominator);
  
  const num = numerator / divisor;
  const den = denominator / divisor;
  
  if (whole > 0) {
    return `${prefix}${whole} ${num}/${den}`;
  }
  return `${prefix}${num}/${den}`;
}

export function formatInch(value: number, precision: number): string {
  if (isNaN(value)) return '-';
  const dec = value.toFixed(precision);
  const frac = decimalToFraction(value);
  return `${dec} in (${frac}")`;
}

export function formatCm(value: number, precision: number): string {
  if (isNaN(value)) return '-';
  return `${value.toFixed(precision)} cm`;
}
