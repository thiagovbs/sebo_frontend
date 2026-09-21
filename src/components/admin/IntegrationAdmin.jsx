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
        boleto_bank_code: c.boleto_bank_code || "",
        boleto_bank_name: c.boleto_bank_name || "",
        boleto_agency: c.boleto_agency || "",
        boleto_account: c.boleto_account || "",
        boleto_wallet: c.boleto_wallet || "",
        boleto_days_to_due: c.boleto_days_to_due ?? 3,
        boleto_instructions: c.boleto_instructions || "",
        sebo_street: c.sebo_street || "",
        sebo_number: c.sebo_number || "",
        sebo_complement: c.sebo_complement || "",
        sebo_district: c.sebo_district || "",
        sebo_state: c.sebo_state || "",
        sebo_zip_code: c.sebo_zip_code || "",
      });
    });
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // O prazo vem de um campo de texto: campo vazio viraria 422 no backend,
      // que espera inteiro.
      const updated = await api.updateIntegration({
        ...form,
        boleto_days_to_due: Number(form.boleto_days_to_due) || 0,
      });
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
            <span className={`badge ${cfg?.boleto_available ? "badge--ok" : "badge--warn"}`}>
              Boleto {cfg?.boleto_available ? "ativo" : "off"}
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

          <div className="divider" />
          <h3 style={{ fontSize: 18 }}>Emissor do boleto</h3>
          <p className="panel__hint">
            Quem recebe e em qual conta o dinheiro cai. Razão social, CNPJ e cidade
            são os mesmos do PIX, acima. Sem isto completo, o boleto não aparece
            para o cliente.
            {/* A lista traz campo em branco e também valor fora de forma
                ("Agência tem mais de 4 dígitos"), então o rótulo não pode
                dizer "faltam". */}
            {cfg && !cfg.boleto_available && cfg.boleto_missing?.length > 0 && (
              <> Pendente: <strong>{cfg.boleto_missing.join(", ")}</strong>.</>
            )}
          </p>
          <div className="row">
            <div className="field">
              <label className="label">Código do banco</label>
              <input className="input" inputMode="numeric" maxLength={3} value={form.boleto_bank_code} onChange={set("boleto_bank_code")} placeholder="341" />
            </div>
            <div className="field">
              <label className="label">Nome do banco</label>
              <input className="input" value={form.boleto_bank_name} onChange={set("boleto_bank_name")} placeholder="Itaú Unibanco" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Agência</label>
              <input className="input" inputMode="numeric" maxLength={4} value={form.boleto_agency} onChange={set("boleto_agency")} placeholder="1234" />
            </div>
            <div className="field">
              <label className="label">Conta</label>
              <input className="input" inputMode="numeric" maxLength={7} value={form.boleto_account} onChange={set("boleto_account")} placeholder="567890" />
            </div>
            <div className="field">
              <label className="label">Carteira</label>
              <input className="input" inputMode="numeric" maxLength={3} value={form.boleto_wallet} onChange={set("boleto_wallet")} placeholder="109" />
            </div>
            <div className="field">
              <label className="label">Vencimento (dias)</label>
              <input className="input" inputMode="numeric" value={form.boleto_days_to_due} onChange={set("boleto_days_to_due")} placeholder="3" />
            </div>
          </div>
          <div className="field">
            <label className="label">Instruções impressas no boleto</label>
            <input className="input" value={form.boleto_instructions} onChange={set("boleto_instructions")} placeholder="Não receber após o vencimento." />
          </div>

          <h3 style={{ fontSize: 18, marginTop: 6 }}>Endereço do beneficiário</h3>
          <div className="row">
            <div className="field">
              <label className="label">Logradouro</label>
              <input className="input" value={form.sebo_street} onChange={set("sebo_street")} placeholder="Rua das Livrarias" />
            </div>
            <div className="field">
              <label className="label">Número</label>
              <input className="input" value={form.sebo_number} onChange={set("sebo_number")} placeholder="100" />
            </div>
            <div className="field">
              <label className="label">Complemento</label>
              <input className="input" value={form.sebo_complement} onChange={set("sebo_complement")} placeholder="Sala 2" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Bairro</label>
              <input className="input" value={form.sebo_district} onChange={set("sebo_district")} placeholder="Centro" />
            </div>
            <div className="field">
              <label className="label">UF</label>
              <input className="input" maxLength={2} value={form.sebo_state} onChange={set("sebo_state")} placeholder="SP" />
            </div>
            <div className="field">
              <label className="label">CEP</label>
              <input className="input" inputMode="numeric" maxLength={9} value={form.sebo_zip_code} onChange={set("sebo_zip_code")} placeholder="01001-000" />
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
          <li><strong>Cartão de crédito</strong>: precisa só da razão social e do CNPJ. A autorização é simulada na própria loja — não há adquirente, e o número do cartão não é guardado em lugar nenhum.</li>
          <li><strong>Boleto</strong>: precisa do beneficiário (razão social, CNPJ e endereço) e da conta (banco, agência, conta e carteira). A linha digitável é calculada pelo padrão FEBRABAN, mas o boleto <strong>não é registrado em banco</strong> nesta demo: ninguém consegue pagá-lo de verdade, e a confirmação é manual.</li>
          <li>Cada método só aparece para o cliente quando estiver <strong>ativo</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
