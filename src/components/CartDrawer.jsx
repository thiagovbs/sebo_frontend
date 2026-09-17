import { useNavigate } from "react-router-dom";
import { api, ApiError, brl } from "../api";
import { useApp } from "../context/AppContext";
import { useEscape } from "../useEscape";

export default function CartDrawer({ onClose }) {
  const { customer, cart, setCart, toast } = useApp();
  const navigate = useNavigate();
  useEscape(onClose);

  const update = async (itemId, quantity) => {
    if (quantity < 1) return;
    try {
      setCart(await api.updateCartItem(customer.id, itemId, { product_id: 0, quantity }));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Falha ao atualizar", "err");
    }
  };
  const remove = async (itemId) => {
    setCart(await api.removeCartItem(customer.id, itemId));
  };

  const items = cart?.items || [];

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" aria-label="Carrinho">
        <div className="drawer__head">
          <h3>Seu carrinho</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="drawer__body">
          {!customer && (
            <div className="empty">
              <div className="empty__mark">👤</div>
              <h3>Escolha um cliente</h3>
              <p>Selecione quem está comprando para montar o carrinho.</p>
            </div>
          )}
          {customer && items.length === 0 && (
            <div className="empty">
              <div className="empty__mark">🛒</div>
              <h3>Carrinho vazio</h3>
              <p>Adicione livros da vitrine.</p>
            </div>
          )}
          {items.map((it) => (
            <div key={it.id} className="cart-line">
              {it.image_url ? (
                <img className="cart-line__cover" src={it.image_url} alt="" />
              ) : (
                <div className="cart-line__cover" />
              )}
              <div className="cart-line__main">
                <div className="cart-line__title">{it.name}</div>
                <div className="cart-line__price">{brl(it.unit_price)} · un.</div>
                <div className="qty">
                  <button onClick={() => update(it.id, it.quantity - 1)} aria-label="Menos">−</button>
                  <span>{it.quantity}</span>
                  <button onClick={() => update(it.id, it.quantity + 1)} aria-label="Mais">+</button>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600 }}>{brl(it.line_total)}</div>
                <button className="btn btn--ghost btn--sm" style={{ marginTop: 8, color: "var(--danger)" }} onClick={() => remove(it.id)}>
                  remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {customer && items.length > 0 && (
          <div className="drawer__foot">
            <div className="summary-row total">
              <span>Total</span>
              <span className="price">{brl(cart.total)}</span>
            </div>
            <button
              className="btn btn--primary btn--block"
              style={{ marginTop: 12 }}
              onClick={() => { onClose(); navigate("/checkout"); }}
            >
              Finalizar compra →
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
