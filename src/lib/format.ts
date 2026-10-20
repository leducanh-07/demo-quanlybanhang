/**
 * Format integer VND to string like "25.000đ"
 */
export function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0đ";
  }
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("vi-VN")}đ`;
}

/**
 * Format signed VND with +/- prefix e.g. "+5.000đ" or "-10.000đ"
 */
export function formatSignedVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0đ";
  }
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${formatVND(amount)}`;
}
