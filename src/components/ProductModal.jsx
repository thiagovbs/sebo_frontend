import { useState } from "react";
import { brl } from "../api";
import { useApp } from "../context/AppContext";
import { useEscape } from "../useEscape";

export default function ProductModal({ product, onClose }) {
  const { addToCart } = useApp();
  const [qty, setQty] = useState(1);
  useEscape(onClose);
  const out = product.stock <= 0;

  const cover = product.image_url || fallback(product);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal__card">
          <div className="modal__cover">
            <img src={cover} alt={`Capa de ${product.name}`} onError={(e) => (e.currentTarget.src = fallback(product))} />
          </div>
          <div className="modal__body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                {product.category && <span className="badge badge--accent" style={{ marginBottom: 10 }}>{product.category}</span>}
                <h2 style={{ fontSize: 32, marginTop: 8 }}>{product.name}</h2>
                {product.brand && <p className="muted" style={{ marginTop: 4 }}>{product.brand}</p>}
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
            </div>

            {product.condition && (
              <p style={{ marginTop: 14 }}>
                <span className="badge">🏷️ {product.condition}</span>
              </p>
            )}

            {product.description && (
              <p className="texto-longo" style={{ marginTop: 16, lineHeight: 1.6 }}>
                {product.description}
              </p>
            )}

            <div className="divider" />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span className="price" style={{ fontSize: 32 }}>{brl(product.price)}</span>
              <span className={`stock-note ${out ? "out" : ""}`}>
                {out ? "esgotado" : `${product.stock} disponível(is)`}
              </span>
            </div>

            {!out && (
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <div className="qty">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Mais">+</button>
                </div>
                <button
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                  onClick={async () => {
                    const ok = await addToCart(product.id, qty);
                    if (ok) onClose();
                  }}
                >
                  Adicionar ao carrinho
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function fallback(product) {
  const initials = (product.name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'><rect width='500' height='500' fill='#2a2119'/><text x='250' y='285' font-family='Georgia, serif' font-size='150' fill='#d7ab5a' text-anchor='middle'>${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
