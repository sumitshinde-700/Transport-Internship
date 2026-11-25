import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  arrayUnion, collection, doc, increment, onSnapshot, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { business } from "../business";
import Logo from "../components/Logo.jsx";
import { billMessage, whatsappUrl } from "../lib/whatsapp";
import { inr, num, fmtDate, round2, rupeesInWords } from "../lib/format";
import { PAY_MODES, balanceOf, statusOf, STATUS_LABEL } from "../lib/billing";

export default function InvoiceView({ user }) {
  const { id } = useParams();
  const [inv, setInv] = useState(undefined); // undefined = loading, null = missing
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState(PAY_MODES[0]);
  const [error, setError] = useState("");
  const [phoneEdit, setPhoneEdit] = useState(null); // null = use the number saved on the bill

  useEffect(
    () => onSnapshot(doc(db, "invoices", id), (s) => setInv(s.exists() ? { id: s.id, ...s.data() } : null)),
    [id]
  );

  if (inv === undefined) return <p className="hint">Loading bill…</p>;
  if (inv === null) {
    return (
      <>
        <div className="page-head"><h2>Bill not found</h2></div>
        <p>This bill does not exist or was removed. <Link to="/billing">Back to billing</Link></p>
      </>
    );
  }

  const balance = balanceOf(inv);
  const status = statusOf(inv);
  const waPhone = phoneEdit ?? inv.customer.phone ?? "";
  const waLink = whatsappUrl(waPhone, billMessage(inv, business));

  async function recordPayment(e) {
    e.preventDefault();
    setError("");
    const amt = round2(Number(amount));
    if (!(amt > 0)) return setError("Enter an amount above ₹0.");
    if (amt > balance) return setError(`The balance due is ${inr(balance)}. Enter that or less.`);

    const batch = writeBatch(db);
    batch.update(doc(db, "invoices", inv.id), {
      paid: increment(amt),
      payments: arrayUnion({ amount: amt, mode, at: Date.now(), by: user }),
    });
    batch.set(doc(collection(db, "accounts")), {
      type: "income", amount: amt,
      note: `Payment: ${inv.number} (${mode}) - ${inv.customer.name}`,
      source: "billing", createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      setAmount("");
    } catch {
      setError("Could not save the payment. Check your connection and try again.");
    }
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h2>{inv.number}</h2>
          <p className="sub"><span className={`chip ${status}`}>{STATUS_LABEL[status]}</span></p>
        </div>
        <div className="actions">
          <Link className="btn secondary" to="/billing">All bills</Link>
          {waLink
            ? <a className="btn secondary" href={waLink} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
            : <a className="btn secondary" href="#whatsapp">Send on WhatsApp</a>}
          <button onClick={() => window.print()}>Print bill</button>
        </div>
      </div>

      <article className="paper">
        <header>
          <div>
            <h1 className="biz"><Logo size={44} />{business.name}</h1>
            {business.address.map((l) => <p key={l}>{l}</p>)}
            <p>Phone {business.phone}</p>
            {business.gstin && <p>GSTIN {business.gstin}</p>}
          </div>
          <div className="doc-id">
            <strong>{inv.number}</strong>
            <p>{inv.gstRate > 0 ? "Tax invoice" : "Bill"}</p>
            <p>{fmtDate(inv.createdAt)}</p>
          </div>
        </header>

        <dl className="meta">
          <div><dt>Billed to</dt><dd>{inv.customer.name}</dd></div>
          {inv.customer.phone && <div><dt>Phone</dt><dd>{inv.customer.phone}</dd></div>}
          {inv.customer.gstin && <div><dt>Customer GSTIN</dt><dd>{inv.customer.gstin}</dd></div>}
          {inv.vehicle && <div><dt>Vehicle</dt><dd>{inv.vehicle}</dd></div>}
        </dl>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Item</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.name}</td>
                  <td className="num">{num(l.qty)} {l.unit}</td>
                  <td className="num">{inr(l.rate)}</td>
                  <td className="num">{inr(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="foot">
          <div className="words">
            <p><strong>Amount in words</strong><br />{rupeesInWords(inv.total)}</p>
            {inv.note && <p>{inv.note}</p>}
            <p className="terms">{business.terms}</p>
          </div>
          <div className="sum">
            <div><span>Subtotal</span><span>{inr(inv.subtotal)}</span></div>
            {inv.discount > 0 && <div><span>Discount</span><span>-{inr(inv.discount)}</span></div>}
            {inv.gstRate > 0 && (
              <>
                <div><span>CGST {inv.gstRate / 2}%</span><span>{inr(inv.tax / 2)}</span></div>
                <div><span>SGST {inv.gstRate / 2}%</span><span>{inr(inv.tax / 2)}</span></div>
              </>
            )}
            <div className="grand"><span>Total</span><span>{inr(inv.total)}</span></div>
            <div><span>Paid</span><span>{inr(inv.paid)}</span></div>
            <div><strong>Balance due</strong><strong>{inr(balance)}</strong></div>
          </div>
        </div>

        <div className="sign"><span>Customer signature</span><span>Authorised signatory</span></div>
      </article>

      <section className="panel no-print" id="whatsapp">
        <h3>Send on WhatsApp</h3>
        <div className="form" style={{ marginBottom: 0 }}>
          <label className="field"><span>Customer WhatsApp number</span>
            <input type="tel" value={waPhone} onChange={(e) => setPhoneEdit(e.target.value)} placeholder="98765 43210" />
            <small>10-digit Indian numbers get +91 added. For other countries, include the country code.</small>
          </label>
          {waLink
            ? <a className="btn" href={waLink} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
            : <button type="button" disabled>Open WhatsApp</button>}
        </div>
        {!waLink && <p className="hint" style={{ margin: "12px 0 0" }}>Enter a valid phone number to send this bill.</p>}
        <p className="hint" style={{ margin: "12px 0 0" }}>
          WhatsApp opens with the bill details typed in. Press send there. To send the printed bill as well, use Print bill, save as PDF, and attach it in the chat.
        </p>
      </section>

      <section className="panel no-print">
        <h3>Payments</h3>
        {inv.payments?.length > 0 ? (
          <ul className="pay-history">
            {inv.payments.map((p, i) => (
              <li key={i}>{fmtDate(p.at)}: {inr(p.amount)} by {p.mode.toLowerCase()}, recorded by {p.by}</li>
            ))}
          </ul>
        ) : <p className="hint">No payment received yet.</p>}

        {balance > 0 ? (
          <form className="form" onSubmit={recordPayment} style={{ marginBottom: 0 }}>
            <label className="field"><span>Amount received (₹)</span>
              <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <button type="button" className="text" style={{ alignSelf: "flex-start" }} onClick={() => setAmount(String(balance))}>
                Fill balance {inr(balance)}
              </button>
            </label>
            <label className="field"><span>Payment mode</span>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                {PAY_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <button>Record payment</button>
          </form>
        ) : <p className="hint">This bill is fully paid.</p>}
        {error && <p className="error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      </section>
    </>
  );
}
