import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError, brl } from "../api";
import { useApp } from "../context/AppContext";
import DeviceLink from "../components/DeviceLink";
import PixQr from "../components/PixQr";

export default function Checkout() {
  const { customer, cart, refreshCart, openFinance, toast } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [paidOrder, setPaidOrder] = useState(null);
  const [pixOrder, setPixOrder] = useState(null); // PIX QR aguardando pagamento
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [method, setMethod] = useState(null); // "pix_qr" | "jsr"
  const [deviceReady, setDeviceReady] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  // Volta da jornada Open Finance com redirect: reconcilia o pedido pela
  // iniciadora e mostra o desfecho (pago ou ainda aguardando).
  const isReturn = searchParams.get("pay") === "return" && !!searchParams.get("order");
  useEffect(() => {
    if (!isReturn) return;
    const orderId = searchParams.get("order");
    api.confirmOpenFinance(orderId)
      .then((o) => {
        if (o.status === "PAID") { setPaidOrder(o); toast("Pagamento confirmado!"); }
        else { setPixOrder(o); toast("Pagamento não concluído — tente de novo ou pague pelo código.", "err"); }
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Falha ao confirmar o pagamento"))
      .finally(() => setSearchParams({}, { replace: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Método padrão: prefere PIX QR (mais simples); senão JSR.
  useEffect(() => {
    if (method) return;
    if (openFinance.pix_qr) setMethod("pix_qr");
    else if (openFinance.jsr) setMethod("jsr");
  }, [openFinance, method]);

  // Endereços do cliente (para escolher a entrega).
  useEffect(() => {
    if (!customer) return;
    api.listAddresses(customer.id).then((list) => {
      setAddresses(list);
      const def = list.find((a) => a.is_default) || list[0];
      if (def) setAddressId(def.id);
    });
  }, [customer]);

  const place = async () => {
    setPlacing(true);
    setError("");
    try {
      const order = await api.checkout({ customer_id: customer.id, address_id: addressId, method });
      refreshCart();
      if (method === "pix_qr") setPixOrder(order); // mostra o QR
      else setPaidOrder(order); // JSR conclui na hora
    } catch (e) {
      if (e instanceof ApiError && e.detail && e.detail.need_enrollment) {
        setDeviceReady(false);
        setError(e.detail.message || "Autorize o pagamento para continuar.");
      } else {
        setError(e instanceof ApiError ? e.message : "Falha no pagamento");
      }
    } finally {
      setPlacing(false);
    }
  };

  // Enquanto reconcilia a volta do banco, evita piscar "carrinho vazio"/login.
  if (isReturn && !paidOrder && !pixOrder) {
    return (
      <main className="container page" style={{ maxWidth: 520 }}>
        <div className="panel center">
          {error ? (
            <>
              <div className="empty__mark" style={{ fontSize: 40 }}>⚠️</div>
              <p className="badge badge--danger" style={{ marginBottom: 14 }}>{error}</p>
              <button className="btn btn--primary" onClick={() => navigate("/conta")}>Ver meus pedidos</button>
            </>
          ) : (
            <p className="muted">Confirmando seu pagamento…</p>
          )}
        </div>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="container page">
        <div className="empty">
          <div className="empty__mark">👤</div>
          <h3>Entre na sua conta</h3>
          <p>Faça login no topo da página para finalizar a compra.</p>
        </div>
      </main>
    );
  }

  if (paidOrder) {
    return (
      <main className="container page" style={{ maxWidth: 720 }}>
        <div className="panel center">
          <div className="empty__mark" style={{ fontSize: 52 }}>✓</div>
          <h2 className="panel__title" style={{ fontSize: 30 }}>Pagamento confirmado</h2>
          <p className="muted" style={{ marginBottom: 18 }}>
            Pedido #{paidOrder.id} · {brl(paidOrder.total)}
          </p>
          <button className="btn btn--primary" onClick={() => navigate("/conta")}>Ver meus pedidos</button>
        </div>
      </main>
    );
  }

  if (pixOrder) {
    return (
      <main className="container page" style={{ maxWidth: 520 }}>
        <PixQr order={pixOrder} onPaid={setPaidOrder} />
      </main>
    );
  }

  const items = cart?.items || [];

  return (
    <main className="container page" style={{ maxWidth: 720 }}>
      <div className="hero" style={{ borderBottom: "none", marginBottom: 8 }}>
        <h1 className="hero__title">Finalizar <em>compra</em></h1>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty__mark">🛒</div>
          <h3>Carrinho vazio</h3>
          <p><Link to="/" style={{ color: "var(--accent)", fontWeight: 600 }}>Voltar à vitrine</Link></p>
        </div>
      ) : (
        <>
          <div className="panel">
            <h2 className="panel__title">Itens</h2>
            <div style={{ marginTop: 12 }}>
              {items.map((it) => (
                <div key={it.id} className="summary-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span>{it.quantity}× {it.name}</span>
                  <span style={{ fontWeight: 600 }}>{brl(it.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span className="price">{brl(cart.total)}</span>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel__title">Entrega</h2>
            {addresses.length === 0 ? (
              <p className="muted" style={{ marginTop: 8 }}>
                Nenhum endereço cadastrado. Você pode seguir sem endereço ou
                adicionar um em <Link to="/conta" style={{ color: "var(--accent)" }}>Minha conta</Link>.
              </p>
            ) : (
              <div className="stack" style={{ marginTop: 12 }}>
                {addresses.map((a) => (
                  <label key={a.id} className="list-item" style={{ cursor: "pointer" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.label}</div>
                      <div className="list-item__meta">{a.street}{a.number ? `, ${a.number}` : ""} · {a.city}/{a.state}</div>
                    </div>
                    <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="panel__title">Pagamento</h2>

            {!openFinance.available ? (
              <div className="empty" style={{ padding: "28px 0" }}>
                <div className="empty__mark">🔒</div>
                <h3>Pagamento indisponível no momento</h3>
                <p>A loja ainda não habilitou o pagamento online. Tente mais tarde.</p>
              </div>
            ) : (
              <>
                {/* Escolha do método (só os disponíveis). */}
                <div className="stack" style={{ margin: "12px 0 16px" }}>
                  {openFinance.pix_qr && (
                    <label className="pay-choice">
                      <input type="radio" name="method" checked={method === "pix_qr"} onChange={() => setMethod("pix_qr")} />
                      <div>
                        <div style={{ fontWeight: 600 }}>📷 PIX — QR Code / copia e cola</div>
                        <div className="list-item__meta">A loja gera o código; você paga no app do seu banco.</div>
                      </div>
                    </label>
                  )}
                  {openFinance.jsr && (
                    <label className="pay-choice">
                      <input type="radio" name="method" checked={method === "jsr"} onChange={() => setMethod("jsr")} />
                      <div>
                        <div style={{ fontWeight: 600 }}>⚡ PIX — Open Finance (sem redirect)</div>
                        <div className="list-item__meta">Você autoriza o Sebo a iniciar o PIX na sua conta (JSR).</div>
                      </div>
                    </label>
                  )}
                </div>

                {/* JSR precisa do dispositivo autorizado. */}
                {method === "jsr" && (
                  <DeviceLink customerId={customer.id} onRegistered={() => setDeviceReady(true)} />
                )}

                {error && <p className="badge badge--danger" style={{ margin: "14px 0" }}>{error}</p>}

                {(method === "pix_qr" || (method === "jsr" && deviceReady)) && (
                  <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={place} disabled={placing}>
                    {placing
                      ? "Processando…"
                      : method === "pix_qr"
                      ? `Gerar PIX de ${brl(cart.total)}`
                      : `Pagar ${brl(cart.total)} com PIX`}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}
