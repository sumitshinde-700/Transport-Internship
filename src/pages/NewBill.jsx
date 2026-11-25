import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  collection, doc, increment, runTransaction, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import useCollection from "../hooks/useCollection";
import { inr, num, round2 } from "../lib/format";
import { GST_RATES, PAY_MODES, computeTotals } from "../lib/billing";

const emptyLine = () => ({ itemId: "", qty: "", rate: "" });

export default function NewBill({ user }) {
  const navigate = useNavigate();
  const items = useCollection("items");
  const past = useCollection("invoices");

  const [customer, setCustomer] = useState({ name: "", phone: "", gstin: "" });
  const [vehicle, setVehicle] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [gstRate, setGstRate] = useState(0);
  const [discount, setDiscount] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [mode, setMode] = useState(PAY_MODES[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totals = computeTotals(lines, discount, gstRate);
  const knownCustomers = [...new Map(past.map((i) => [i.customer?.name?.toLowerCase(), i.customer])).values()]
    .filter((c) => c?.name);

  function changeName(name) {
    const match = knownCustomers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setCustomer((c) => ({
      name,
      phone: c.phone || match?.phone || "",
      gstin: c.gstin || match?.gstin || "",
    }));
  }

  const setLine = (idx, key) => (e) =>
    setLines(lines.map((l, i) => (i === idx ? { ...l, [key]: e.target.value } : l)));
  const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));

  async function save(e) {
    e.preventDefault();
    setError("");

    const filled = lines.map((l) => ({
      item: items.find((i) => i.id === l.itemId), qty: Number(l.qty), rate: Number(l.rate),
    }));
    if (filled.some((l) => !l.item || !(l.qty > 0) || !(l.rate >= 0))) {
      return setError("Each line needs an item, a quantity above 0 and a rate.");
    }
    const paid = round2(Math.min(Math.max(Number(paidNow) || 0, 0), totals.total));
    if (totals.total <= 0) return setError("The bill total must be above ₹0.");

    // total quantity needed per item (the same item can appear on two lines)
    const need = {};
    filled.forEach((l) => { need[l.item.id] = (need[l.item.id] || 0) + l.qty; });

    setSaving(true);
    try {
      const invoiceId = await runTransaction(db, async (tx) => {
        // all reads first
        const counterRef = doc(db, "counters", "invoice");
        const counterSnap = await tx.get(counterRef);
        const fresh = {};
        for (const id of Object.keys(need)) fresh[id] = await tx.get(doc(db, "items", id));
        for (const [id, snap] of Object.entries(fresh)) {
          const it = snap.data();
          if (!snap.exists() || it.qty < need[id]) {
            throw new Error(`Only ${num(it?.qty ?? 0)} ${it?.unit ?? ""} of ${it?.name ?? "this item"} in stock.`);
          }
        }

        const next = counterSnap.exists() ? counterSnap.data().next : 1;
        const number = `INV-${String(next).padStart(4, "0")}`;
        tx.set(counterRef, { next: next + 1 });

        const invoiceRef = doc(collection(db, "invoices"));
        tx.set(invoiceRef, {
          number,
          customer: {
            name: customer.name.trim(), phone: customer.phone.trim(), gstin: customer.gstin.trim().toUpperCase(),
          },
          vehicle: vehicle.trim(),
          lines: filled.map((l) => ({
            itemId: l.item.id, name: l.item.name, unit: l.item.unit,
            qty: l.qty, rate: l.rate, amount: round2(l.qty * l.rate),
          })),
          ...totals,
          gstRate: Number(gstRate),
          paid,
          payments: paid > 0 ? [{ amount: paid, mode, at: Date.now(), by: user }] : [],
          note: note.trim(),
          createdBy: user,
          createdAt: serverTimestamp(),
        });

        // stock out history + stock levels
        filled.forEach((l) => {
          tx.set(doc(collection(db, "stockOut")), {
            itemId: l.item.id, itemName: l.item.name, unit: l.item.unit,
            qty: l.qty, rate: l.rate, total: round2(l.qty * l.rate),
            party: customer.name.trim(), vehicle: vehicle.trim(),
            source: "billing", invoiceNo: number, createdAt: serverTimestamp(),
          });
        });
        Object.entries(need).forEach(([id, qty]) => {
          tx.update(doc(db, "items", id), { qty: increment(-qty) });
        });

        // income is booked when money is received
        if (paid > 0) {
          tx.set(doc(collection(db, "accounts")), {
            type: "income", amount: paid,
            note: `Payment: ${number} (${mode}) - ${customer.name.trim()}`,
            source: "billing", createdAt: serverTimestamp(),
          });
        }
        return invoiceRef.id;
      });
      navigate(`/billing/${invoiceId}`);
    } catch (err) {
      setError(err.message || "Could not save the bill. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="page-head">
        <div>
          <h2>New bill</h2>
          <p className="sub">Saving the bill removes the stock and records any payment received.</p>
        </div>
        <Link className="btn secondary" to="/billing">Cancel</Link>
      </div>

      <section className="panel">
        <h3>Customer</h3>
        <div className="grid-2">
          <label className="field"><span>Customer name</span>
            <input list="customers" value={customer.name} onChange={(e) => changeName(e.target.value)} required />
            <datalist id="customers">{knownCustomers.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          </label>
          <label className="field"><span>WhatsApp / phone number</span>
            <input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </label>
          <label className="field"><span>Customer GSTIN</span>
            <input value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} />
          </label>
          <label className="field"><span>Vehicle number</span>
            <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel">
        <h3>Items</h3>
        <div className="lines">
          {lines.map((l, idx) => {
            const amount = (Number(l.qty) || 0) * (Number(l.rate) || 0);
            return (
              <div className="line" key={idx}>
                <label className="field"><span>Item</span>
                  <select value={l.itemId} onChange={setLine(idx, "itemId")} required>
                    <option value="">Select item</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} ({num(i.qty)} {i.unit} in stock)</option>
                    ))}
                  </select>
                </label>
                <label className="field"><span>Quantity</span>
                  <input type="number" min="0" step="any" value={l.qty} onChange={setLine(idx, "qty")} required />
                </label>
                <label className="field"><span>Rate (₹)</span>
                  <input type="number" min="0" step="any" value={l.rate} onChange={setLine(idx, "rate")} required />
                </label>
                <div className="field"><span>Amount</span><div className="amount">{inr(amount)}</div></div>
                {lines.length > 1
                  ? <button type="button" className="danger" onClick={() => removeLine(idx)} aria-label={`Remove line ${idx + 1}`}>Remove</button>
                  : <span />}
              </div>
            );
          })}
        </div>
        <button type="button" className="secondary" onClick={() => setLines([...lines, emptyLine()])}>Add another item</button>
        {items.length === 0 && <p className="hint">There are no items yet. Add items on the Items page first.</p>}
      </section>

      <section className="panel">
        <h3>Totals and payment</h3>
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <label className="field"><span>Discount (₹)</span>
            <input type="number" min="0" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </label>
          <label className="field"><span>GST</span>
            <select value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))}>
              {GST_RATES.map((r) => <option key={r} value={r}>{r === 0 ? "No GST" : `${r}%`}</option>)}
            </select>
          </label>
          <label className="field"><span>Payment received now (₹)</span>
            <input type="number" min="0" step="any" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} />
            <button type="button" className="text" style={{ alignSelf: "flex-start" }} onClick={() => setPaidNow(String(totals.total))}>
              Paid in full
            </button>
          </label>
          <label className="field"><span>Payment mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {PAY_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
        </div>

        <div className="sum">
          <div><span>Subtotal</span><span>{inr(totals.subtotal)}</span></div>
          {totals.discount > 0 && <div><span>Discount</span><span>-{inr(totals.discount)}</span></div>}
          {gstRate > 0 && <div><span>GST {gstRate}%</span><span>{inr(totals.tax)}</span></div>}
          <div className="grand"><span>Total</span><span>{inr(totals.total)}</span></div>
        </div>

        <label className="field" style={{ marginTop: 20 }}><span>Note on the bill</span>
          <textarea rows="2" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button disabled={saving}>{saving ? "Saving…" : "Save bill"}</button>
      </div>
    </form>
  );
}
