const money = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

export const inr = (n) => "₹" + money.format(Number(n) || 0);
export const num = (n) => plain.format(Number(n) || 0);
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function fmtDate(ts) {
  const d = ts?.toDate ? ts.toDate() : typeof ts === "number" ? new Date(ts) : null;
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "…";
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : ""));
const below1000 = (n) =>
  [n >= 100 ? ONES[Math.floor(n / 100)] + " Hundred" : "", n % 100 ? below100(n % 100) : ""]
    .filter(Boolean).join(" ");

// 1,23,456.50 -> "One Lakh Twenty Three Thousand Four Hundred Fifty Six rupees and Fifty paise only"
export function rupeesInWords(amount) {
  const cents = Math.round((Number(amount) || 0) * 100);
  let rupees = Math.floor(cents / 100);
  const paise = cents % 100;
  const crore = Math.floor(rupees / 1e7); rupees %= 1e7;
  const lakh = Math.floor(rupees / 1e5); rupees %= 1e5;
  const thousand = Math.floor(rupees / 1e3); rupees %= 1e3;
  const parts = [
    crore ? below1000(crore) + " Crore" : "",
    lakh ? below100(lakh) + " Lakh" : "",
    thousand ? below100(thousand) + " Thousand" : "",
    rupees ? below1000(rupees) : "",
  ].filter(Boolean);
  let words = (parts.join(" ") || "Zero") + " rupees";
  if (paise) words += " and " + below100(paise) + " paise";
  return words + " only";
}
