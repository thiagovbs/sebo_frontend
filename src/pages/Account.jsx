import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError, brl } from "../api";
import { lookupCep } from "../cep";
import { useApp } from "../context/AppContext";
import OrderStatus from "../components/OrderStatus";
import { FichaModal } from "../components/Boleto";
import DeviceLink from "../components/DeviceLink";
import LoginForm from "../components/LoginForm";

export default function Account() {
  const { customer, toast, openFinance, logout } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Volta da autorização na iniciadora (jornada JSR). O DeviceLink abaixo já
  // sincroniza o status; aqui só avisamos o cliente e limpamos a query para o
  // toast não repetir num refresh.
  useEffect(() => {
    if (searchParams.get("enroll") !== "return") return;
    const status = searchParams.get("status") || "";
    if (status === "DEVICE_REGISTERED" || status === "REGISTERED") {
      toast("Pagamento por PIX autorizado!");
    } else if (status === "error") {
      toast("Não foi possível concluir a autorização", "err");
    } else {
      toast("Voltando da autorização…");
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  if (!customer) {
    return (
      <main className="container page" style={{ maxWidth: 440 }}>
        <div className="hero" style={{ borderBottom: "none", marginBottom: 8 }}>
          <div>
            <h1 className="hero__title">Entrar</h1>
            <p className="hero__sub">Acesse sua conta para ver pedidos, endereços e cartões.</p>
          </div>
        </div>
        <div className="panel">
          <LoginForm />
        </div>
      </main>
    );
  }

  return (
    <main className="container page">
      <div className="hero">
        <div>
          <h1 className="hero__title">Minha <em>conta</em></h1>
          <p className="hero__sub">
            {customer.name || customer.email} · {customer.email}
            {customer.cpf ? ` · CPF ${customer.cpf}` : ""}
            {customer.birth_date ? ` · nasc. ${new Date(customer.birth_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
          </p>
        </div>
        <button className="btn" onClick={() => { logout(); navigate("/"); }}>Sair da conta</button>
      </div>

      <div className="two-col">
        <div>
          {openFinance.jsr && (
            <div className="panel">
              <h2 className="panel__title">Autorização de pagamento (PIX Open Finance)</h2>
              <p className="panel__hint">
                Jornada JSR: autorize o Sebo On-Line a iniciar PIX na sua conta e
                pague sem redirect.
              </p>
              <DeviceLink customerId={customer.id} />
            </div>
          )}
          <Addresses customer={customer} toast={toast} />
          <PaymentMethods customer={customer} toast={toast} />
        </div>
        <Orders customer={customer} />
      </div>
    </main>
  );
}

function Addresses({ customer, toast }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(blankAddress());
  const [open, setOpen] = useState(false);
  const [cepBusy, setCepBusy] = useState(false);

  const load = () => api.listAddresses(customer.id).then(setList).catch(() => {});
  useEffect(() => { load(); }, [customer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCep = async (value) => {
    setForm((f) => ({ ...f, zip_code: value }));
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepBusy(true);
    const found = await lookupCep(digits);
    setCepBusy(false);
    if (found) setForm((f) => ({ ...f, ...found }));
    else toast("CEP não encontrado — preencha manualmente", "err");
  };

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.addAddress(customer.id, form);
      setForm(blankAddress());
      setOpen(false);
      load();
      toast("Endereço adicionado");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Falha", "err");
    }
  };

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="panel__title">Endereços</h2>
        <button className="btn btn--sm" onClick={() => setOpen((o) => !o)}>{open ? "Cancelar" : "+ Novo"}</button>
      </div>
      <p className="panel__hint">Para onde as compras irão.</p>

      {open && (
        <form onSubmit={add} className="stack" style={{ marginBottom: 18 }}>
          <input className="input" placeholder="Rótulo (Casa, Trabalho)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <div className="row">
            <input className="input" style={{ maxWidth: 160 }} placeholder="CEP" inputMode="numeric" value={form.zip_code} onChange={(e) => onCep(e.target.value)} />
            <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>
              {cepBusy ? "buscando…" : "o CEP preenche o resto"}
            </span>
          </div>
          <div className="row">
            <input className="input" placeholder="Rua" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            <input className="input" placeholder="Nº" style={{ maxWidth: 100 }} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          </div>
          <div className="row">
            <input className="input" placeholder="Bairro" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            <input className="input" placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className="input" style={{ maxWidth: 80 }} placeholder="UF" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
            Definir como padrão
          </label>
          <button className="btn btn--primary" type="submit">Salvar endereço</button>
        </form>
      )}

      {list.length === 0 && <p className="muted">Nenhum endereço cadastrado.</p>}
      {list.map((a) => (
        <div key={a.id} className="list-item">
          <div>
            <div style={{ fontWeight: 600 }}>
              {a.label} {a.is_default && <span className="badge badge--accent">padrão</span>}
            </div>
            <div className="list-item__meta">
              {a.street}{a.number ? `, ${a.number}` : ""} — {a.district} · {a.city}/{a.state} {a.zip_code}
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" style={{ color: "var(--danger)" }} onClick={async () => { await api.deleteAddress(customer.id, a.id); load(); }}>
            remover
          </button>
        </div>
      ))}
    </div>
  );
}

function PaymentMethods({ customer, toast }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(blankMethod());
  const [open, setOpen] = useState(false);

  const load = () => api.listPaymentMethods(customer.id).then(setList).catch(() => {});
  useEffect(() => { load(); }, [customer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.addPaymentMethod(customer.id, form);
      setForm(blankMethod());
      setOpen(false);
      load();
      toast("Forma de pagamento adicionada");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Falha", "err");
    }
  };

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="panel__title">Cartões de crédito</h2>
        <button className="btn btn--sm" onClick={() => setOpen((o) => !o)}>{open ? "Cancelar" : "+ Novo"}</button>
      </div>
      <p className="panel__hint">
        Só bandeira, 4 últimos dígitos, titular e validade — nunca o número completo ou o CVV.
        No checkout, o pagamento é PIX via Open Finance.
      </p>

      {open && (
        <form onSubmit={add} className="stack" style={{ marginBottom: 18 }}>
          <input className="input" placeholder="Apelido (Cartão principal)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <div className="row">
            <select className="select" style={{ maxWidth: 150 }} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
              {["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outra"].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <input className="input" placeholder="4 últimos dígitos" maxLength={4} value={form.last4} onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, "") })} />
            <input className="input" style={{ maxWidth: 120 }} placeholder="MM/AA" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
          </div>
          <input className="input" placeholder="Nome impresso no cartão" value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
            Cartão padrão
          </label>
          <button className="btn btn--primary" type="submit">Salvar cartão</button>
        </form>
      )}

      {list.length === 0 && <p className="muted">Nenhum cartão cadastrado.</p>}
      {list.map((m) => (
        <div key={m.id} className="list-item">
          <div>
            <div style={{ fontWeight: 600 }}>
              💳 {m.brand} {m.last4 ? `•••• ${m.last4}` : ""} {m.is_default && <span className="badge badge--accent">padrão</span>}
            </div>
            <div className="list-item__meta">
              {m.label && `${m.label} · `}{m.holder}{m.expiry ? ` · val. ${m.expiry}` : ""}
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" style={{ color: "var(--danger)" }} onClick={async () => { await api.deletePaymentMethod(customer.id, m.id); load(); }}>
            remover
          </button>
        </div>
      ))}
    </div>
  );
}

function Orders({ customer }) {
  const [orders, setOrders] = useState(null);
  // Boleto aberto no histórico. A tela do checkout some quando a pessoa sai
  // dela, e o boleto vence dias depois: sem isto, quem fechou a aba ficava sem
  // a linha digitável.
  const [ficha, setFicha] = useState(null);
  const [carregando, setCarregando] = useState(0);
  useEffect(() => {
    api.customerOrders(customer.id).then(setOrders).catch(() => setOrders([]));
  }, [customer.id]);

  const abrirBoleto = async (id) => {
    setCarregando(id);
    try {
      setFicha(await api.boletoDocument(id));
    } catch {
      // Sem toast aqui: o histórico não tem o contexto de erro do checkout.
      setFicha(null);
    } finally {
      setCarregando(0);
    }
  };

  return (
    <div className="panel">
      <h2 className="panel__title">Histórico de pedidos</h2>
      <p className="panel__hint">Seus pedidos, do mais recente ao mais antigo.</p>

      {orders === null && <p className="muted">Carregando…</p>}
      {orders && orders.length === 0 && (
        <div className="empty" style={{ padding: "32px 0" }}>
          <div className="empty__mark">📦</div>
          <h3>Sem pedidos ainda</h3>
          <p>Que tal <Link to="/" style={{ color: "var(--accent)", fontWeight: 600 }}>visitar a vitrine</Link>?</p>
        </div>
      )}
      {orders && orders.map((o) => (
        <div key={o.id} className="order-card">
          <div className="order-card__head">
            <span className="order-card__id">Pedido #{o.id}</span>
            <OrderStatus status={o.status} />
          </div>
          <div className="order-card__items">
            {o.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
          </div>
          <div className="summary-row total" style={{ marginTop: 10 }}>
            <span className="muted" style={{ fontSize: 13 }}>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
            <span className="price" style={{ fontSize: 20 }}>{brl(o.total)}</span>
          </div>
          {o.payment_method === "boleto" && o.boleto_digitable_line && (
            <button
              className="btn btn--sm"
              style={{ marginTop: 10 }}
              onClick={() => abrirBoleto(o.id)}
              disabled={carregando === o.id}
            >
              {carregando === o.id ? "montando…" : "ver boleto / salvar PDF"}
            </button>
          )}
        </div>
      ))}

      {ficha && <FichaModal ficha={ficha} onClose={() => setFicha(null)} />}
    </div>
  );
}

const blankAddress = () => ({
  label: "Casa", street: "", number: "", complement: "",
  district: "", city: "", state: "", zip_code: "", is_default: false,
});

const blankMethod = () => ({
  label: "", brand: "Visa", last4: "", holder: "", expiry: "", is_default: false,
});
