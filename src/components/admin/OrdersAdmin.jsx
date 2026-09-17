import { useEffect, useState } from "react";
import { api, brl } from "../../api";
import OrderStatus from "../OrderStatus";

export default function OrdersAdmin() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState("TODOS");

  useEffect(() => {
    api.adminOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  if (orders === null) return <p className="muted">Carregando pedidos…</p>;

  const statuses = ["TODOS", ...Array.from(new Set(orders.map((o) => o.status)))];
  const shown = filter === "TODOS" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
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
                <th className="num">Total</th><th>Status</th><th>Data</th>
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
                  <td><OrderStatus status={o.status} /></td>
                  <td className="list-item__meta">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
