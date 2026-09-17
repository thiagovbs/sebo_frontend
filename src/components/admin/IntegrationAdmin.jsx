import { useEffect, useState } from "react";
import { api, ApiError } from "../../api";
import { useApp } from "../../context/AppContext";

const PIX_TYPES = ["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"];

// Dados de integração com a aplicação pagadora (iniciadora), editáveis em tempo
// de execução. Enquanto não estiverem completos, o cliente não vê o pagamento
// por Open Finance.
export default function IntegrationAdmin() {
  const { toast, refreshOpenFinance } = useApp();
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.getIntegration().then((c) => {
      setCfg(c);
      setForm({
        payment_initiator_url: c.payment_initiator_url,
        payment_initiator_user: c.payment_initiator_user,
        payment_initiator_password: "", // nunca vem preenchida; em branco mantém
        sebo_name: c.sebo_name,
        sebo_cpf_cnpj: c.sebo_cpf_cnpj,
        sebo_city: c.sebo_city || "SAO PAULO",
        sebo_pix_key_type: c.sebo_pix_key_type || "CNPJ",
        sebo_pix_key_value: c.sebo_pix_key_value,
      });
    });
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateIntegration(form);
      setCfg(updated);
      setForm({ ...form, payment_initiator_password: "" });
      await refreshOpenFinance();
      toast(updated.configured ? "Integração salva e ativa" : "Integração salva (incompleta)");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Falha ao salvar", "err");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <p className="muted">Carregando configuração…</p>;

  return (
    <div className="two-col">
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 className="panel__title">Integração de pagamento</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`badge ${cfg?.pix_qr_available ? "badge--ok" : "badge--warn"}`}>
              PIX QR {cfg?.pix_qr_available ? "ativo" : "off"}
            </span>
            <span className={`badge ${cfg?.configured ? "badge--ok" : "badge--warn"}`}>
              JSR {cfg?.configured ? "ativo" : "off"}
            </span>
          </div>
        </div>
        <p className="panel__hint">
          Credenciais do lojista na aplicação pagadora e dados do recebedor do PIX.
          Enquanto estiver incompleta, o cliente não vê o pagamento por Open Finance.
        </p>

        <form onSubmit={save} className="stack">
          <div className="field">
            <label className="label">URL da iniciadora</label>
            <input className="input" value={form.payment_initiator_url} onChange={set("payment_initiator_url")} placeholder="https://…" />
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Usuário (lojista)</label>
              <input className="input" value={form.payment_initiator_user} onChange={set("payment_initiator_user")} placeholder="sebo_online" />
            </div>
            <div className="field">
              <label className="label">Senha {cfg?.has_password && <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>(salva)</span>}</label>
              <input className="input" type="password" value={form.payment_initiator_password} onChange={set("payment_initiator_password")} placeholder={cfg?.has_password ? "•••••• (em branco mantém)" : "senha"} />
            </div>
          </div>

          <div className="divider" />
          <h3 style={{ fontSize: 18 }}>Recebedor do PIX (o sebo)</h3>
          <div className="row">
            <div className="field">
              <label className="label">Nome</label>
              <input className="input" value={form.sebo_name} onChange={set("sebo_name")} placeholder="Sebo On-Line" />
            </div>
            <div className="field">
              <label className="label">CPF/CNPJ</label>
              <input className="input" value={form.sebo_cpf_cnpj} onChange={set("sebo_cpf_cnpj")} />
            </div>
            <div className="field">
              <label className="label">Cidade (QR PIX)</label>
              <input className="input" value={form.sebo_city} onChange={set("sebo_city")} placeholder="SAO PAULO" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Tipo da chave PIX</label>
              <select className="select" value={form.sebo_pix_key_type} onChange={set("sebo_pix_key_type")}>
                {PIX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Chave PIX</label>
              <input className="input" value={form.sebo_pix_key_value} onChange={set("sebo_pix_key_value")} />
            </div>
          </div>

          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Salvar integração"}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2 className="panel__title">Como funciona</h2>
        <p className="panel__hint">O checkout paga por PIX via Open Finance (jornada JSR).</p>
        <ul style={{ paddingLeft: 18, lineHeight: 1.7, color: "var(--muted)", fontSize: 14 }}>
          <li>Estes dados ficam no banco e valem <strong>em tempo de execução</strong> — não no <code>.env</code>.</li>
          <li><strong>PIX QR</strong> (copia e cola): precisa só do recebedor (nome, cidade e chave). A loja gera o código; o cliente paga no app do banco.</li>
          <li><strong>PIX JSR</strong> (Open Finance, sem redirect): precisa também das credenciais da iniciadora (URL, usuário, senha).</li>
          <li>A senha nunca é exibida; deixe em branco para mantê-la.</li>
          <li>Cada método só aparece para o cliente quando estiver <strong>ativo</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
