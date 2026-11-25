import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import useCollection from "../hooks/useCollection";
import { inr, fmtDate } from "../lib/format";

export default function Accounting() {
  const entries = useCollection("accounts");
  const [form, setForm] = useState({ type: "expense", amount: "", note: "" });

  const income = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  async function add(e) {
    e.preventDefault();
    await addDoc(collection(db, "accounts"), {
      type: form.type, amount: Number(form.amount), note: form.note,
      source: "manual", createdAt: serverTimestamp(),
    });
    setForm({ type: "expense", amount: "", note: "" });
  }

  return (
    <>
      <div className="page-head"><h2>Accounting</h2></div>
      <div className="ledger">
        <div><span>Income</span><strong className="in">{inr(income)}</strong></div>
        <div><span>Expense</span><strong className="out">{inr(expense)}</strong></div>
        <div><span>Profit</span><strong>{inr(income - expense)}</strong></div>
      </div>

      <form className="form" onSubmit={add}>
        <label className="field"><span>Type</span>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="expense">Expense (fuel, salary, repair)</option>
            <option value="income">Income (freight, other)</option>
          </select>
        </label>
        <label className="field"><span>Amount</span>
          <input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </label>
        <label className="field"><span>Note</span>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} required />
        </label>
        <button>Add entry</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Note</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{fmtDate(e.createdAt)}</td>
                <td className={e.type === "income" ? "in" : "out"}>{e.type === "income" ? "Income" : "Expense"}</td>
                <td>{e.note}</td>
                <td className="num">{inr(e.amount)}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan="4" className="empty">No entries yet. Add your first entry above.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
