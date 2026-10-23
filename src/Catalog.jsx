import React, { useState } from "react";
export default function Catalog() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  async function toggle() {
    if (!open) {
      try {
        const response = await fetch("/integrations.json");
        if (response.ok) setItems(await response.json());
      } catch {
        setItems([]);
      }
    }
    setOpen(!open);
  }
  return (
    <>
      <button className="catalog-toggle" onClick={toggle} aria-expanded={open}>
        API integrations
      </button>
      {open && (
        <aside className="catalog">
          <h2>Available integrations</h2>
          <p>Catalog only. Live connections and delivery are disabled.</p>
          {items.map((a) => (
            <div key={a.name} className="catalog-item">
              <strong>{a.name}</strong>
              <div>{a.purpose}</div>
              <small>{a.status}</small>
            </div>
          ))}
        </aside>
      )}
    </>
  );
}
