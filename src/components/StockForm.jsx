import { useState } from "react";
import {
  collection, doc, increment, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import useCollection from "../hooks/useCollection";
import { inr, num, fmtDate } from "../lib/format";

// One form + history table used by both Stock in and Stock out.
export default function StockForm({ type }) {
  const isIn = type === "in";
  const items = useCollection("items");
  const history = useCollection(isIn ? "stockIn" : "stockOut");
  const empty = { itemId: "", qty: "", rate: "", party: "", vehicle: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    const item = items.find((i) => i.id === form.itemId);
    const qty = Number(form.qty);
    const rate = Number(form.rate);
    if (!item || qty <= 0 || rate < 0) return setError("Fill all fields correctly.");
    if (!isIn && qty > item.qty) return setError(`Only ${item.qty} ${item.unit} in stock.`);

    const total = qty * rate;
    const batch = writeBatch(db);

    // 1. movement record
    batch.set(doc(collection(db, isIn ? "stockIn" : "stockOut")), {
      itemId: item.id, itemName: item.name, unit: item.unit,
      qty, rate, total, party: form.party, vehicle: form.vehicle,
      createdAt: serverTimestamp(),
    });
    // 2. update item stock
    batch.update(doc(db, "items", item.id), { qty: increment(isIn ? qty : -qty) });
    // 3. accounting entry (stock in = expense, stock out = income)
    batch.set(doc(collection(db, "accounts")), {
      type: isIn ? "expense" : "income",
      amount: total,
      note: `${isIn ? "Stock in" : "Stock out"}: ${item.name} x ${qty}`,
      source: "stock",
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    setForm(empty);
  }

  return (
    <>
      <div className="page-head"><h2>{isIn ? "Stock in" : "Stock out"}</h2></div>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Item</span>
          <select value={form.itemId} onChange={set("itemId")} required>
            <option value="">Select item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({num(i.qty)} {i.unit})</option>
            ))}
          </select>
        </label>
        <label className="field"><span>Quantity</span>
          <input type="number" min="0" step="any" value={form.qty} onChange={set("qty")} required />
        </label>
        <label className="field"><span>{isIn ? "Cost per unit" : "Price per unit"}</span>
          <input type="number" min="0" step="any" value={form.rate} onChange={set("rate")} required />
        </label>
        <label className="field"><span>{isIn ? "Supplier" : "Customer"}</span>
          <input value={form.party} onChange={set("party")} required />
        </label>
        <label className="field"><span>Vehicle number</span>
          <input value={form.vehicle} onChange={set("vehicle")} />
        </label>
        <button>{isIn ? "Add stock" : "Remove stock"}</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Item</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Total</th>
              <th>{isIn ? "Supplier" : "Customer"}</th><th>Vehicle</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{fmtDate(h.createdAt)}</td>
                <td>{h.itemName}</td>
                <td className="num">{num(h.qty)} {h.unit}</td>
                <td className="num">{inr(h.rate)}</td>
                <td className="num">{inr(h.total)}</td>
                <td>{h.party}{h.invoiceNo && <> <span className="hint">({h.invoiceNo})</span></>}</td>
                <td>{h.vehicle}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan="7" className="empty">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
