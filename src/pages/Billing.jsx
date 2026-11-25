import { useState } from "react";
import { Link } from "react-router-dom";
import useCollection from "../hooks/useCollection";
import { inr, fmtDate } from "../lib/format";
import { balanceOf, statusOf, STATUS_LABEL } from "../lib/billing";

const FILTERS = [["all", "All"], ["unpaid", "Unpaid"], ["partial", "Part paid"], ["paid", "Paid"]];

export default function Billing() {
  const invoices = useCollection("invoices");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const billed = invoices.reduce((s, i) => s + i.total, 0);
  const collected = invoices.reduce((s, i) => s + (i.paid || 0), 0);

  const term = q.trim().toLowerCase();
  const shown = invoices.filter((i) => {
    if (filter !== "all" && statusOf(i) !== filter) return false;
    if (!term) return true;
    return [i.number, i.customer?.name, i.vehicle].some((v) => v?.toLowerCase().includes(term));
  });

  return (
    <>
      <div className="page-head">
        <h2>Billing</h2>
        <Link className="btn" to="/billing/new">New bill</Link>
      </div>

      <div className="ledger">
        <div><span>Billed</span><strong>{inr(billed)}</strong></div>
        <div><span>Collected</span><strong className="in">{inr(collected)}</strong></div>
        <div><span>To collect</span><strong className="out">{inr(billed - collected)}</strong></div>
      </div>

      <div className="filters">
        <div className="seg" role="group" aria-label="Filter by payment status">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
        <input
          type="search" aria-label="Search bills" placeholder="Search bill no., customer or vehicle"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bill</th><th>Date</th><th>Customer</th><th>Vehicle</th>
              <th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id}>
                <td><Link to={`/billing/${i.id}`}>{i.number}</Link></td>
                <td>{fmtDate(i.createdAt)}</td>
                <td>{i.customer?.name}</td>
                <td>{i.vehicle}</td>
                <td className="num">{inr(i.total)}</td>
                <td className="num">{inr(i.paid)}</td>
                <td className="num">{inr(balanceOf(i))}</td>
                <td><span className={`chip ${statusOf(i)}`}>{STATUS_LABEL[statusOf(i)]}</span></td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan="8" className="empty">
                {invoices.length === 0 ? "No bills yet. Create your first bill." : "No bills match this filter."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
