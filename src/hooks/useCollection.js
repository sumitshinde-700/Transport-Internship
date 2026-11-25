import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

// Live list of documents from a Firestore collection, newest first.
export default function useCollection(name) {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const q = query(collection(db, name), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [name]);

  return docs;
}
