import { useEffect, useState } from "react";
import { api, ApiError, brl } from "../../api";
import { useApp } from "../../context/AppContext";
import OrderStatus from "../OrderStatus";

// Pedidos, e a confirmação de pagamento de PIX QR e boleto -- os métodos em que
// o dinheiro chega depois. A confirmação mora aqui porque quem confere o extrato
// é a loja; numa loja real este é o lugar onde o webhook do PSP ou o arquivo de
// retorno do banco chegariam.
export default function OrdersAdmin() {
  const { toast } = useApp();
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState("TODOS");
  const [confirming, setConfirming] = useState(null);

  const load = () => api.adminOrders().then(setOrders).catch(() => setOrders([]));
  useEffect(() => { load(); }, []);

  const confirmPayment = async (order) => {
    setConfirming(order.id);
    try {
      await api.adminConfirmPayment(order.id);
      // Relê a lista inteira: o pedido muda de status e sai do filtro de
      // pendentes, e remendar a linha no lugar esconderia isso.
      await load();
      toast(`Pagamento do pedido #${order.id} registrado`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Falha ao registrar o pagamento", "err");
    } finally {
      setConfirming(null);
    }
  };

  if (orders === null) return <p className="muted">Carregando pedidos…</p>;

  const pendentes = orders.filter((o) => o.awaiting_confirmation).length;

  const statuses = ["TODOS", ...Array.from(new Set(orders.map((o) => o.status)))];
  const shown = filter === "TODOS" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      {pendentes > 0 && (
        <p className="panel__hint" style={{ marginBottom: 12 }}>
          {pendentes === 1
            ? "1 pedido aguardando confirmação de pagamento."
            : `${pendentes} pedidos aguardando confirmação de pagamento.`}{" "}
          Confirme depois de identificar o recebimento no extrato.
        </p>
      )}

      <div className="chips" style={{ marginBottom: 18 }}>
        {statuses.map((s) => (
          <button key={s} className={`chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
            {s === "TODOS" ? "Todos" : s}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty"><div className="empty__mark">📦</div><h3>Nenhum pedido</h3></div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Pedido</th><th>Cliente</th><th>Itens</th>
                <th className="num">Total</th><th>Pagamento</th><th>Status</th>
                <th>Data</th><th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>#{o.id}</td>
                  <td>
                    <div>{o.customer?.name || "—"}</div>
                    <div className="list-item__meta">{o.customer?.email}</div>
                  </td>
                  <td style={{ maxWidth: 280, whiteSpace: "normal" }}>
                    <span className="list-item__meta">
                      {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </span>
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>{brl(o.total)}</td>
                  <td className="list-item__meta">
                    {METODOS[o.payment_method] || o.payment_method}
                    {o.card_last4 && <div>****{o.card_last4}</div>}
                    {o.boleto_due_date && <div>vence {formatarData(o.boleto_due_date)}</div>}
                  </td>
                  <td><OrderStatus status={o.status} /></td>
                  <td className="list-item__meta">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td>
                    {o.awaiting_confirmation && (
                      <button
                        className="btn btn--sm btn--primary"
                        onClick={() => confirmPayment(o)}
                        disabled={confirming === o.id}
                      >
                        {confirming === o.id ? "Registrando…" : "Registrar pagamento"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const METODOS = {
  jsr: "PIX Open Finance",
  pix_qr: "PIX QR",
  card: "Cartão",
  boleto: "Boleto",
};

function formatarData(iso) {
  // Meio-dia para a data não escorregar um dia por fuso.
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
}
