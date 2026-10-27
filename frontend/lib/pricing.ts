import { KDV_RATE, PAYMENT_FEE_RATE } from "./constants";

/** KDV dahil fiyattan KDV ve ödeme komisyonu düşülünce kalan net gelir. */
export function netRevenue(priceTry: number): number {
  return (priceTry / (1 + KDV_RATE)) * (1 - PAYMENT_FEE_RATE);
}

/**
 * Kâr çarpanı = net gelir / en kötü durumda GPU maliyeti
 * (tüm kredilerin Turbo ile harcandığı varsayılır).
 */
export function marginMultiplier(priceTry: number, credits: number, costPerMinute: number): number {
  const cost = credits * costPerMinute;
  return cost > 0 ? netRevenue(priceTry) / cost : Infinity;
}

export function formatTry(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}
