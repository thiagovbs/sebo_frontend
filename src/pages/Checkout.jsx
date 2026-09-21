import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError, brl } from "../api";
import { useApp } from "../context/AppContext";
import Boleto from "../components/Boleto";
import DeviceLink from "../components/DeviceLink";
import PixQr from "../components/PixQr";

const CARTAO_NOVO = "novo";

export default function Checkout() {
  const { customer, cart, refreshCart, openFinance, toast } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [paidOrder, setPaidOrder] = useState(null);
  const [pixOrder, setPixOrder] = useState(null); // PIX QR aguardando pagamento
  const [boletoOrder, setBoletoOrder] = useState(null); // boleto emitido
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [method, setMethod] = useState(null); // "pix_qr" | "jsr" | "card" | "boleto"
  const [deviceReady, setDeviceReady] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  // Cartões salvos do cadastro, e o formulário de um novo. O número digitado
  // vive só neste estado: ele vai na requisição e não é guardado em lugar
  // nenhum -- nem aqui, nem no banco.
  const [cards, setCards] = useState([]);
  const [cardId, setCardId] = useState(null);
  const [newCard, setNewCard] = useState({
    number: "", holder: "", expiry: "", cvv: "", label: "", save: false,
  });

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

  // Método padrão: prefere PIX QR (mais simples); senão JSR, cartão, boleto.
  useEffect(() => {
    if (method) return;
    if (openFinance.pix_qr) setMethod("pix_qr");
    else if (openFinance.jsr) setMethod("jsr");
    else if (openFinance.card) setMethod("card");
    else if (openFinance.boleto) setMethod("boleto");
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

  // Cartões salvos. O padrão vem pré-selecionado; sem nenhum, abre o
  // formulário de um novo -- que é o caminho de quem está comprando a primeira
  // vez.
  useEffect(() => {
    if (!customer) return;
    api.listPaymentMethods(customer.id).then((list) => {
      setCards(list);
      const def = list.find((c) => c.is_default) || list[0];
      setCardId(def ? def.id : CARTAO_NOVO);
    });
  }, [customer]);

  const setCardField = (k) => (e) =>
    setNewCard({ ...newCard, [k]: k === "save" ? e.target.checked : e.target.value });

  const place = async () => {
    setPlacing(true);
    setError("");
    try {
      const body = { customer_id: customer.id, address_id: addressId, method };
      if (method === "card") {
        if (cardId === CARTAO_NOVO) {
          body.card = {
            number: newCard.number.replace(/\D/g, ""),
            holder: newCard.holder,
            expiry: newCard.expiry,
            cvv: newCard.cvv,
            label: newCard.label,
            save: newCard.save,
          };
        } else {
          body.payment_method_id = cardId;
        }
      }
      const order = await api.checkout(body);
      refreshCart();
      // Limpa o cartão digitado da memória do navegador assim que ele sai.
      setNewCard({ number: "", holder: "", expiry: "", cvv: "", label: "", save: false });
      if (method === "pix_qr") setPixOrder(order);
      else if (method === "boleto") setBoletoOrder(order);
      else setPaidOrder(order); // JSR e cartão concluem na hora
    } catch (e) {
      if (e instanceof ApiError && e.detail && e.detail.need_enrollment) {
        setDeviceReady(false);
        setError(e.detail.message || "Autorize o pagamento para continuar.");
      } else if (e instanceof ApiError && e.detail && e.detail.message) {
        // Recusa do cartão e boleto indisponível trazem a razão no detalhe.
        setError(e.detail.message);
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
            {paidOrder.card_last4 && (
              <> · {paidOrder.card_brand} ****{paidOrder.card_last4}</>
            )}
          </p>
          {paidOrder.card_authorization && (
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Autorização <code>{paidOrder.card_authorization}</code>
            </p>
          )}
          <button className="btn btn--primary" onClick={() => navigate("/conta")}>Ver meus pedidos</button>
        </div>
      </main>
    );
  }

  if (pixOrder) {
    return (
      <main className="container page" style={{ maxWidth: 520 }}>
        <PixQr order={pixOrder} />
      </main>
    );
  }

  if (boletoOrder) {
    return (
      <main className="container page" style={{ maxWidth: 520 }}>
        <Boleto order={boletoOrder} />
      </main>
    );
  }

  const items = cart?.items || [];
  const cartaoPronto =
    cardId !== CARTAO_NOVO ||
    (newCard.number.replace(/\D/g, "").length >= 13 && newCard.holder.trim() && newCard.expiry.trim() && newCard.cvv.trim());
  const podePagar =
    method === "pix_qr" ||
    method === "boleto" ||
    (method === "card" && cartaoPronto) ||
    (method === "jsr" && deviceReady);

  const rotuloDoBotao = () => {
    if (placing) return "Processando…";
    if (method === "pix_qr") return `Gerar PIX de ${brl(cart.total)}`;
    if (method === "boleto") return `Gerar boleto de ${brl(cart.total)}`;
    if (method === "card") return `Pagar ${brl(cart.total)} no cartão`;
    return `Pagar ${brl(cart.total)} com PIX`;
  };

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
                  {openFinance.card && (
                    <label className="pay-choice">
                      <input type="radio" name="method" checked={method === "card"} onChange={() => setMethod("card")} />
                      <div>
                        <div style={{ fontWeight: 600 }}>💳 Cartão de crédito</div>
                        <div className="list-item__meta">Use um cartão salvo ou informe outro na hora.</div>
                      </div>
                    </label>
                  )}
                  {openFinance.boleto && (
                    <label className="pay-choice">
                      <input type="radio" name="method" checked={method === "boleto"} onChange={() => setMethod("boleto")} />
                      <div>
                        <div style={{ fontWeight: 600 }}>🧾 Boleto bancário</div>
                        <div className="list-item__meta">A loja emite a linha digitável; o pedido fica reservado até o vencimento.</div>
                      </div>
                    </label>
                  )}
                </div>

                {/* JSR precisa do dispositivo autorizado. */}
                {method === "jsr" && (
                  <DeviceLink customerId={customer.id} onRegistered={() => setDeviceReady(true)} />
                )}

                {method === "card" && (
                  <div className="stack">
                    {cards.map((c) => (
                      <label key={c.id} className="list-item" style={{ cursor: "pointer" }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.brand} ****{c.last4}</div>
                          <div className="list-item__meta">
                            {c.label}{c.holder ? ` · ${c.holder}` : ""}{c.expiry ? ` · val. ${c.expiry}` : ""}
                          </div>
                        </div>
                        <input type="radio" name="card" checked={cardId === c.id} onChange={() => setCardId(c.id)} />
                      </label>
                    ))}
                    <label className="list-item" style={{ cursor: "pointer" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Usar outro cartão</div>
                        <div className="list-item__meta">Os dados vão apenas nesta compra.</div>
                      </div>
                      <input type="radio" name="card" checked={cardId === CARTAO_NOVO} onChange={() => setCardId(CARTAO_NOVO)} />
                    </label>

                    {cardId === CARTAO_NOVO && (
                      <div className="stack" style={{ marginTop: 4 }}>
                        <div className="field">
                          <label className="label">Número do cartão</label>
                          <input
                            className="input"
                            inputMode="numeric"
                            autoComplete="cc-number"
                            maxLength={23}
                            value={newCard.number}
                            onChange={setCardField("number")}
                            placeholder="0000 0000 0000 0000"
                          />
                        </div>
                        <div className="field">
                          <label className="label">Nome impresso no cartão</label>
                          <input className="input" autoComplete="cc-name" value={newCard.holder} onChange={setCardField("holder")} />
                        </div>
                        <div className="row">
                          <div className="field">
                            <label className="label">Validade</label>
                            <input className="input" autoComplete="cc-exp" maxLength={7} value={newCard.expiry} onChange={setCardField("expiry")} placeholder="MM/AA" />
                          </div>
                          <div className="field">
                            <label className="label">Código de segurança</label>
                            <input className="input" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={newCard.cvv} onChange={setCardField("cvv")} placeholder="123" />
                          </div>
                        </div>
                        <label className="list-item" style={{ cursor: "pointer" }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>Salvar este cartão</div>
                            {/* Dito na tela porque é verdade e importa: o número
                                não fica guardado em lugar nenhum. */}
                            <div className="list-item__meta">
                              Guardamos só bandeira, quatro últimos dígitos, nome e validade.
                            </div>
                          </div>
                          <input type="checkbox" checked={newCard.save} onChange={setCardField("save")} />
                        </label>
                        {newCard.save && (
                          <div className="field">
                            <label className="label">Apelido (opcional)</label>
                            <input className="input" value={newCard.label} onChange={setCardField("label")} placeholder="Cartão principal" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="badge badge--danger" style={{ margin: "14px 0" }}>{error}</p>}

                {podePagar && (
                  <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={place} disabled={placing}>
                    {rotuloDoBotao()}
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
