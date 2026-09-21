import { useState } from "react";
import { Link } from "react-router-dom";
import { brl } from "../api";
import { useApp } from "../context/AppContext";

// Boleto gerado no checkout: mostra a linha digitável (que é o que a pessoa
// copia para o app do banco), o vencimento e o valor. Quem confirma o
// recebimento é a LOJA, no admin -- numa loja real seria o arquivo de retorno
// do banco, e nesta demo o boleto não é registrado em banco nenhum.
export default function Boleto({ order }) {
  const { toast } = useApp();
  const [copied, setCopied] = useState(false);

  const linha = order.boleto_digitable_line_formatted || order.boleto_digitable_line;

  const copy = async () => {
    try {
      // Copia só os dígitos: é o que o app do banco espera receber.
      await navigator.clipboard.writeText(order.boleto_digitable_line);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Não foi possível copiar", "err");
    }
  };

  const vencimento = order.boleto_due_date
    ? new Date(`${order.boleto_due_date}T12:00:00`).toLocaleDateString("pt-BR")
    : "";

  return (
    <div className="panel center">
      <h2 className="panel__title" style={{ fontSize: 26 }}>Boleto gerado</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Pedido #{order.id} · {brl(order.total)}
      </p>

      <div className="pix-copia">
        <code style={{ letterSpacing: 0.5 }}>{linha}</code>
      </div>
      <button className="btn btn--sm" style={{ marginTop: 8 }} onClick={copy}>
        {copied ? "copiado ✓" : "copiar linha digitável"}
      </button>

      <div className="divider" />

      <div className="summary-row">
        <span>Vencimento</span>
        <span style={{ fontWeight: 600 }}>{vencimento || "—"}</span>
      </div>
      <div className="summary-row">
        <span>Nosso número</span>
        <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{order.boleto_our_number}</span>
      </div>
      <div className="summary-row total">
        <span>Valor</span>
        <span className="price">{brl(order.total)}</span>
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
        Pague no app do seu banco com a linha digitável até o vencimento — o
        pedido fica reservado até lá. Ele é liberado quando a loja identificar o
        recebimento.
      </p>
      <Link className="btn btn--primary btn--block" style={{ marginTop: 10 }} to="/conta">
        Acompanhar em Minha conta
      </Link>
    </div>
  );
}
