import { useEffect, useState } from "react";
import { adminToken, api } from "../api";
import AdminLogin from "../components/admin/AdminLogin";
import Dashboard from "../components/admin/Dashboard";
import ProductsAdmin from "../components/admin/ProductsAdmin";
import OrdersAdmin from "../components/admin/OrdersAdmin";
import CustomersAdmin from "../components/admin/CustomersAdmin";
import IntegrationAdmin from "../components/admin/IntegrationAdmin";

const TABS = [
  { key: "dashboard", label: "Dashboard", render: () => <Dashboard /> },
  { key: "produtos", label: "Produtos", render: () => <ProductsAdmin /> },
  { key: "pedidos", label: "Pedidos", render: () => <OrdersAdmin /> },
  { key: "clientes", label: "Clientes", render: () => <CustomersAdmin /> },
  { key: "integracao", label: "Integração", render: () => <IntegrationAdmin /> },
];

export default function Admin() {
  const [tab, setTab] = useState("dashboard");
  // null = verificando o token; false = precisa logar; true = liberado.
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    if (!adminToken.get()) return setAuthed(false);
    // Confere se o token ainda vale (pode ter expirado).
    api
      .adminStats(1)
      .then(() => setAuthed(true))
      .catch(() => { adminToken.clear(); setAuthed(false); });
  }, []);

  const logout = () => { adminToken.clear(); setAuthed(false); };

  if (authed === null) {
    return <main className="container page"><p className="muted">Verificando acesso…</p></main>;
  }

  if (!authed) {
    return (
      <main className="container page">
        <AdminLogin onSuccess={() => setAuthed(true)} />
      </main>
    );
  }

  const active = TABS.find((t) => t.key === tab);
  return (
    <main className="container page">
      <div className="hero" style={{ borderBottom: "none", marginBottom: 8 }}>
        <div>
          <h1 className="hero__title">Painel <em>admin</em></h1>
          <p className="hero__sub">Gestão da loja: vendas, catálogo, pedidos e clientes.</p>
        </div>
        <button className="btn" onClick={logout}>Sair do painel</button>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`admin-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {active.render()}
    </main>
  );
}
