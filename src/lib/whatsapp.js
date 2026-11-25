import { inr, num, fmtDate } from "./format";
import { balanceOf } from "./billing";

// Returns digits with country code (e.g. 919876543210), or null if the number looks invalid.
export function whatsappNumber(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) return "91" + d; // Indian mobile without country code
  if (d.length >= 11 && d.length <= 15) return d; // already has a country code
  return null;
}

export function billMessage(inv, business) {
  const lines = inv.lines.map((l) => `• ${l.name}: ${num(l.qty)} ${l.unit} x ${inr(l.rate)} = ${inr(l.amount)}`);
  const balance = balanceOf(inv);
  return [
    `Hello ${inv.customer.name},`,
    `Here is your bill ${inv.number} from ${business.name}, dated ${fmtDate(inv.createdAt)}.`,
    "",
    ...lines,
    "",
    inv.discount > 0 ? `Discount: -${inr(inv.discount)}` : null,
    inv.gstRate > 0 ? `GST ${inv.gstRate}%: ${inr(inv.tax)}` : null,
    `Total: ${inr(inv.total)}`,
    `Paid: ${inr(inv.paid)}`,
    balance > 0 ? `Balance due: ${inr(balance)}` : "Fully paid. Thank you!",
    "",
    business.phone && business.phone !== "00000 00000" ? `Questions? Call ${business.phone}.` : null,
  ].filter((l) => l !== null).join("\n");
}

export function whatsappUrl(phone, text) {
  const n = whatsappNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
