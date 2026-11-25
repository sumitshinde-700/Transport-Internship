import { round2 } from "./format";

export const GST_RATES = [0, 5, 12, 18, 28];
export const PAY_MODES = ["Cash", "UPI", "Bank transfer", "Cheque"];

export function computeTotals(lines, discount, gstRate) {
  const subtotal = round2(lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0));
  const disc = round2(Math.min(Math.max(Number(discount) || 0, 0), subtotal));
  const taxable = round2(subtotal - disc);
  const tax = round2((taxable * (Number(gstRate) || 0)) / 100);
  return { subtotal, discount: disc, taxable, tax, total: round2(taxable + tax) };
}

export const balanceOf = (inv) => Math.max(round2(inv.total - (inv.paid || 0)), 0);

export function statusOf(inv) {
  if (balanceOf(inv) === 0) return "paid";
  return (inv.paid || 0) > 0 ? "partial" : "unpaid";
}

export const STATUS_LABEL = { paid: "Paid", partial: "Part paid", unpaid: "Unpaid" };
