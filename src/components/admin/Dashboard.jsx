import { useEffect, useState } from "react";
import { api, brl } from "../../api";
import RevenueBars from "../charts/RevenueBars";
import OrderStatus from "../OrderStatus";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.adminStats(14).then(setStats).catch(() => setError(true));
  }, []);

  if (error) return <p className="muted">Não foi possível carregar as métricas.</p>;
  if (!stats) return <p className="muted">Carregando métricas…</p>;

  const k = stats.kpis;
  const maxQty = Math.max(1, ...stats.top_products.map((p) => p.quantity));

  return (
    <div>
      <div className="kpis">
        <Kpi label="Receita (pagos)" value={brl(k.revenue)} accent sub={`${k.paid_orders} pedido(s) pago(s)`} />
        <Kpi label="Ticket médio" value={brl(k.avg_ticket)} />
        <Kpi label="Pedidos" value={k.total_orders} sub={`${k.paid_orders} pagos`} />
        <Kpi label="Clientes" value={k.customers} />
        <Kpi label="Produtos ativos" value={k.active_products} sub={`${k.total_products} no total`} />
      </div>

      <div className="dash-grid">
        <div className="panel">
          <h2 className="panel__title">Receita por dia</h2>
          <p className="panel__hint">Últimos 14 dias · apenas pedidos pagos</p>
          <RevenueBars data={stats.revenue_by_day} />
        </div>

        <div>
          <div className="panel">
            <h2 className="panel__title">Mais vendidos</h2>
            <p className="panel__hint">Por quantidade (pedidos pagos)</p>
            {stats.top_products.length === 0 ? (
              <p className="muted">Nenhuma venda ainda.</p>
            ) : (
              <div className="hbars">
                {stats.top_products.map((p) => (
                  <div key={p.name}>
                    <div className="hbar__top">
                      <span className="hbar__name">{p.name}</span>
                      <span className="hbar__val">{p.quantity} un · {brl(p.revenue)}</span>
                    </div>
                    <div className="hbar__track">
                      <div className="hbar__fill" style={{ width: `${(p.quantity / maxQty) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="panel__title">Pedidos por status</h2>
            <div className="status-row" style={{ marginTop: 12 }}>
              {Object.keys(stats.orders_by_status).length === 0 && (
                <p className="muted">Sem pedidos ainda.</p>
              )}
              {Object.entries(stats.orders_by_status).map(([status, count]) => (
                <div key={status} className="status-pill">
                  <b>{count}</b>
                  <OrderStatus status={status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className={`kpi__value ${accent ? "accent" : ""}`}>{value}</div>
      {sub && <div className="kpi__sub">{sub}</div>}
    </div>
  );
}
