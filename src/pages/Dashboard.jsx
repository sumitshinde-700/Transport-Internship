import { Link } from "react-router-dom";
import useCollection from "../hooks/useCollection";
import { inr, num, fmtDate } from "../lib/format";
import { balanceOf, statusOf, STATUS_LABEL } from "../lib/billing";

export default function Dashboard() {
  const items = useCollection("items");
  const entries = useCollection("accounts");
  const invoices = useCollection("invoices");

  const income = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const toCollect = invoices.reduce((s, i) => s + balanceOf(i), 0);
  const maxQty = Math.max(1, ...items.map((i) => i.qty));

  return (
    <>
      <div className="page-head">
        <h2>Dashboard</h2>
        <Link className="btn" to="/billing/new">New bill</Link>
      </div>

      <div className="ledger">
        <div><span>Income</span><strong className="in">{inr(income)}</strong></div>
        <div><span>Expense</span><strong className="out">{inr(expense)}</strong></div>
        <div><span>Profit</span><strong>{inr(income - expense)}</strong></div>
        <div><span>To collect</span><strong>{inr(toCollect)}</strong></div>
      </div>

      <div className="split">
        <section>
          <h3>Stock on hand</h3>
          <ul className="stock-list">
            {items.map((i) => (
              <li key={i.id}>
                <div className="stock-row"><span>{i.name}</span><span>{num(i.qty)} {i.unit}</span></div>
                <div className="bar" aria-hidden="true"><i style={{ width: `${Math.max(0, (i.qty / maxQty) * 100)}%` }} /></div>
              </li>
            ))}
            {items.length === 0 && <li className="empty">No items yet. Add one on the Items page.</li>}
          </ul>
        </section>

        <section>
          <h3>Recent bills</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Bill</th><th>Customer</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {invoices.slice(0, 6).map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/billing/${i.id}`}>{i.number}</Link><br /><span className="hint">{fmtDate(i.createdAt)}</span></td>
                    <td>{i.customer?.name}</td>
                    <td className="num">
                      {inr(balanceOf(i))}<br />
                      <span className={`chip ${statusOf(i)}`}>{STATUS_LABEL[statusOf(i)]}</span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan="3" className="empty">No bills yet. Create your first bill.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
