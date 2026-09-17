import { useEffect, useState } from "react";
import { api, ApiError, brl } from "../../api";
import { useApp } from "../../context/AppContext";
import OrderStatus from "../OrderStatus";

export default function CustomersAdmin() {
  const [customers, setCustomers] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    api.adminCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  if (selectedId) {
    return <CustomerDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  if (customers === null) return <p className="muted">Carregando clientes…</p>;
  if (customers.length === 0)
    return <div className="empty"><div className="empty__mark">👥</div><h3>Nenhum cliente cadastrado</h3></div>;

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Cliente</th><th>Contato</th><th>CPF</th>
            <th className="num">Pedidos</th><th className="num">Pagos</th>
            <th className="num">Total gasto</th><th>Desde</th><th></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(c.id)}>
              <td style={{ fontWeight: 600 }}>{c.name || "—"}</td>
              <td>
                <div>{c.email}</div>
                {c.phone && <div className="list-item__meta">{c.phone}</div>}
              </td>
              <td className="list-item__meta">{c.cpf || "—"}</td>
              <td className="num">{c.orders_count}</td>
              <td className="num">{c.paid_count}</td>
              <td className="num" style={{ fontWeight: 600 }}>{brl(c.total_spent)}</td>
              <td className="list-item__meta">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
              <td><span className="btn btn--ghost btn--sm">ver ficha →</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerDetail({ id, onBack }) {
  const { toast } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => api.adminCustomer(id).then(setData).catch(() => setError(true));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteDevice = async () => {
    if (!window.confirm("Apagar a autorização de pagamento (PIX Open Finance) deste cliente? Ele precisará autorizar de novo para pagar por PIX.")) return;
    setBusy(true);
    try {
      await api.adminDeleteDevice(id);
      await load();
      toast("Autorização de pagamento apagada");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Falha ao apagar a autorização", "err");
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="muted">Não foi possível carregar a ficha. <button className="btn btn--sm" onClick={onBack}>Voltar</button></p>;
  if (!data) return <p className="muted">Carregando ficha…</p>;

  const { customer: c, addresses, payment_methods, device, orders, stats } = data;
  const dev = { REGISTERED: ["Autorizado", "badge--ok"], PENDING: ["Pendente", "badge--warn"] };
  const devInfo = device.enrolled ? (dev[device.status] || [device.status, ""]) : ["Não autorizado", ""];

  return (
    <div>
      <button className="btn btn--sm" onClick={onBack} style={{ marginBottom: 18 }}>← Voltar aos clientes</button>

      <div className="two-col">
        <div>
          <div className="panel">
            <h2 className="panel__title">{c.name || "(sem nome)"}</h2>
            <p className="panel__hint">Dados cadastrais</p>
            <dl className="deflist">
              <Row k="E-mail" v={c.email} />
              <Row k="Telefone" v={c.phone || "—"} />
              <Row k="CPF" v={c.cpf || "—"} />
              <Row k="Nascimento" v={c.birth_date ? new Date(c.birth_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"} />
              <Row k="Cliente desde" v={new Date(c.created_at).toLocaleDateString("pt-BR")} />
              <Row k="Pagamento PIX" v={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <span className={`badge ${devInfo[1]}`}>{devInfo[0]}</span>
                  {device.enrolled && (
                    <button className="btn btn--ghost btn--sm" style={{ color: "var(--danger)" }} onClick={deleteDevice} disabled={busy}>
                      {busy ? "apagando…" : "apagar autorização"}
                    </button>
                  )}
                </span>
              } />
            </dl>
          </div>

          <div className="panel">
            <h2 className="panel__title">Endereços ({addresses.length})</h2>
            {addresses.length === 0 && <p className="muted">Nenhum endereço.</p>}
            {addresses.map((a) => (
              <div key={a.id} className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{a.label} {a.is_default && <span className="badge badge--accent">padrão</span>}</div>
                  <div className="list-item__meta">{a.street}{a.number ? `, ${a.number}` : ""} — {a.district} · {a.city}/{a.state} {a.zip_code}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <h2 className="panel__title">Cartões ({payment_methods.length})</h2>
            {payment_methods.length === 0 && <p className="muted">Nenhum cartão.</p>}
            {payment_methods.map((m) => (
              <div key={m.id} className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>💳 {m.brand} {m.last4 ? `•••• ${m.last4}` : ""} {m.is_default && <span className="badge badge--accent">padrão</span>}</div>
                  <div className="list-item__meta">{m.label && `${m.label} · `}{m.holder}{m.expiry ? ` · val. ${m.expiry}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 className="panel__title">Histórico de pedidos ({stats.orders_count})</h2>
          </div>
          <p className="panel__hint">{stats.paid_count} pago(s) · total gasto {brl(stats.total_spent)}</p>

          {orders.length === 0 && <p className="muted">Sem pedidos.</p>}
          {orders.map((o) => (
            <div key={o.id} className="order-card">
              <div className="order-card__head">
                <span className="order-card__id">Pedido #{o.id}</span>
                <OrderStatus status={o.status} />
              </div>
              <div className="order-card__items">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</div>
              <div className="summary-row total" style={{ marginTop: 10 }}>
                <span className="muted" style={{ fontSize: 13 }}>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                <span className="price" style={{ fontSize: 20 }}>{brl(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="deflist__row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
