import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { lookupCep } from "../cep";
import { useApp } from "../context/AppContext";

const emptyAddress = () => ({
  label: "Casa", street: "", number: "", complement: "",
  district: "", city: "", state: "", zip_code: "", is_default: false,
});
const emptyCard = () => ({
  label: "", brand: "Visa", last4: "", holder: "", expiry: "", is_default: false,
});
const BRANDS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outra"];

export default function Register() {
  const { applyAuth, toast } = useApp();
  const navigate = useNavigate();

  const [person, setPerson] = useState({ name: "", email: "", password: "", cpf: "", phone: "", birth_date: "" });
  const [addresses, setAddresses] = useState([emptyAddress()]);
  const [cards, setCards] = useState([emptyCard()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setP = (k) => (e) => setPerson({ ...person, [k]: e.target.value });

  const updateAt = (list, setList, i, patch) =>
    setList(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  // Ao informar o CEP, busca o endereço no ViaCEP e preenche os campos.
  const [cepBusy, setCepBusy] = useState(null);
  const onCep = async (i, value) => {
    updateAt(addresses, setAddresses, i, { zip_code: value });
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepBusy(i);
    const found = await lookupCep(digits);
    setCepBusy(null);
    if (found) {
      updateAt(addresses, setAddresses, i, {
        street: found.street, district: found.district, city: found.city, state: found.state,
      });
    } else {
      toast("CEP não encontrado — preencha manualmente", "err");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Só envia endereços/cartões que o cliente chegou a preencher.
      const filledAddresses = addresses.filter((a) => a.street || a.city);
      const filledCards = cards.filter((c) => c.last4 || c.holder || c.label);
      const auth = await api.registerCustomer({
        ...person,
        addresses: filledAddresses,
        payment_methods: filledCards,
      });
      const customer = await applyAuth(auth); // já entra logado
      toast(`Cadastro concluído. Bem-vindo(a), ${customer.name || customer.email}!`);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container page" style={{ maxWidth: 780 }}>
      <div className="hero" style={{ borderBottom: "none", marginBottom: 8 }}>
        <div>
          <h1 className="hero__title">Criar <em>conta</em></h1>
          <p className="hero__sub">
            Seus dados são usados na entrega e no pagamento via PIX Open Finance.
            Você pode cadastrar mais de um endereço e mais de uma forma de pagamento.
          </p>
        </div>
      </div>

      <form onSubmit={submit}>
        {/* ---- Dados pessoais ---- */}
        <div className="panel">
          <h2 className="panel__title">Dados pessoais</h2>
          <div className="row">
            <div className="field">
              <label className="label">Nome *</label>
              <input className="input" required value={person.name} onChange={setP("name")} placeholder="Maria Leitora" />
            </div>
            <div className="field">
              <label className="label">E-mail *</label>
              <input className="input" type="email" required value={person.email} onChange={setP("email")} placeholder="maria@email.com" />
            </div>
            <div className="field">
              <label className="label">Senha * <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>(mín. 6)</span></label>
              <input className="input" type="password" required minLength={6} value={person.password} onChange={setP("password")} placeholder="••••••••" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="label">CPF</label>
              <input className="input" value={person.cpf} onChange={setP("cpf")} placeholder="000.000.000-00" />
            </div>
            <div className="field">
              <label className="label">Telefone</label>
              <input className="input" value={person.phone} onChange={setP("phone")} placeholder="(11) 90000-0000" />
            </div>
            <div className="field">
              <label className="label">Data de nascimento</label>
              <input className="input" type="date" value={person.birth_date} onChange={setP("birth_date")} />
            </div>
          </div>
        </div>

        {/* ---- Endereços ---- */}
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="panel__title">Endereços</h2>
            <button type="button" className="btn btn--sm" onClick={() => setAddresses([...addresses, emptyAddress()])}>
              + Adicionar endereço
            </button>
          </div>
          <p className="panel__hint">Para onde os pedidos são enviados.</p>

          {addresses.map((a, i) => (
            <div key={i} className="subform">
              <div className="subform__head">
                <input
                  className="input" style={{ maxWidth: 200 }}
                  value={a.label} onChange={(e) => updateAt(addresses, setAddresses, i, { label: e.target.value })}
                  placeholder="Rótulo (Casa, Trabalho)"
                />
                {addresses.length > 1 && (
                  <button type="button" className="btn btn--ghost btn--sm" style={{ color: "var(--danger)" }}
                    onClick={() => setAddresses(addresses.filter((_, idx) => idx !== i))}>
                    remover
                  </button>
                )}
              </div>
              <div className="row">
                <div style={{ maxWidth: 180 }}>
                  <input className="input" placeholder="CEP" value={a.zip_code}
                    onChange={(e) => onCep(i, e.target.value)} inputMode="numeric" />
                </div>
                <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>
                  {cepBusy === i ? "buscando endereço…" : "informe o CEP para preencher automaticamente"}
                </span>
              </div>
              <div className="row">
                <input className="input" placeholder="Rua" value={a.street} onChange={(e) => updateAt(addresses, setAddresses, i, { street: e.target.value })} />
                <input className="input" placeholder="Nº" style={{ maxWidth: 110 }} value={a.number} onChange={(e) => updateAt(addresses, setAddresses, i, { number: e.target.value })} />
              </div>
              <div className="row">
                <input className="input" placeholder="Bairro" value={a.district} onChange={(e) => updateAt(addresses, setAddresses, i, { district: e.target.value })} />
                <input className="input" placeholder="Cidade" value={a.city} onChange={(e) => updateAt(addresses, setAddresses, i, { city: e.target.value })} />
                <input className="input" placeholder="UF" style={{ maxWidth: 90 }} value={a.state} onChange={(e) => updateAt(addresses, setAddresses, i, { state: e.target.value })} />
              </div>
              <label className="check">
                <input type="radio" name="addr-default" checked={a.is_default}
                  onChange={() => setAddresses(addresses.map((x, idx) => ({ ...x, is_default: idx === i })))} />
                Endereço padrão
              </label>
            </div>
          ))}
        </div>

        {/* ---- Cartões de crédito ---- */}
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="panel__title">Cartões de crédito</h2>
            <button type="button" className="btn btn--sm" onClick={() => setCards([...cards, emptyCard()])}>
              + Adicionar cartão
            </button>
          </div>
          <p className="panel__hint">
            Opcional. Guardamos só bandeira, 4 últimos dígitos, titular e validade —
            nunca o número completo ou o CVV. No checkout, o pagamento é PIX via Open Finance.
          </p>

          {cards.map((c, i) => (
            <div key={i} className="subform">
              <div className="subform__head">
                <input className="input" style={{ maxWidth: 220 }} placeholder="Apelido (Cartão principal)"
                  value={c.label} onChange={(e) => updateAt(cards, setCards, i, { label: e.target.value })} />
                {cards.length > 1 && (
                  <button type="button" className="btn btn--ghost btn--sm" style={{ color: "var(--danger)" }}
                    onClick={() => setCards(cards.filter((_, idx) => idx !== i))}>
                    remover
                  </button>
                )}
              </div>
              <div className="row">
                <select className="select" style={{ maxWidth: 160 }}
                  value={c.brand} onChange={(e) => updateAt(cards, setCards, i, { brand: e.target.value })}>
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <input className="input" style={{ maxWidth: 150 }} placeholder="4 últimos dígitos" maxLength={4}
                  value={c.last4} onChange={(e) => updateAt(cards, setCards, i, { last4: e.target.value.replace(/\D/g, "") })} />
                <input className="input" style={{ maxWidth: 120 }} placeholder="Validade MM/AA"
                  value={c.expiry} onChange={(e) => updateAt(cards, setCards, i, { expiry: e.target.value })} />
              </div>
              <div className="row">
                <input className="input" placeholder="Nome impresso no cartão"
                  value={c.holder} onChange={(e) => updateAt(cards, setCards, i, { holder: e.target.value })} />
              </div>
              <label className="check">
                <input type="radio" name="card-default" checked={c.is_default}
                  onChange={() => setCards(cards.map((x, idx) => ({ ...x, is_default: idx === i })))} />
                Cartão padrão
              </label>
            </div>
          ))}
        </div>

        {error && <p className="badge badge--danger" style={{ marginBottom: 14 }}>{error}</p>}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Criando conta…" : "Criar conta"}
          </button>
          <Link to="/" className="muted">Cancelar</Link>
        </div>
      </form>
    </main>
  );
}
