import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import useCollection from "../hooks/useCollection";
import { num } from "../lib/format";

export default function Items() {
  const items = useCollection("items");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");

  async function add(e) {
    e.preventDefault();
    await addDoc(collection(db, "items"), {
      name: name.trim(), unit: unit.trim(), qty: 0, createdAt: serverTimestamp(),
    });
    setName("");
    setUnit("");
  }

  return (
    <>
      <div className="page-head"><h2>Items</h2></div>
      <form className="form" onSubmit={add}>
        <label className="field"><span>Item name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field"><span>Unit</span>
          <input placeholder="kg, box, bag" value={unit} onChange={(e) => setUnit(e.target.value)} required />
        </label>
        <button>Add item</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Unit</th><th className="num">In stock</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.name}</td><td>{i.unit}</td><td className="num">{num(i.qty)}</td></tr>
            ))}
            {items.length === 0 && <tr><td colSpan="3" className="empty">No items yet. Add your first item above.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
