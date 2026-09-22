import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { api, brl } from "../api";
import { useApp } from "../context/AppContext";
import { useEscape } from "../useEscape";
import BoletoDocumento from "./BoletoDocumento";

// Boleto gerado no checkout: mostra a linha digitável (que é o que a pessoa
// copia para o app do banco), o vencimento e o valor. Quem confirma o
// recebimento é a LOJA, no admin -- numa loja real seria o arquivo de retorno
// do banco, e nesta demo o boleto não é registrado em banco nenhum.
//
// A ficha impressa fica atrás de um clique, e não aberta junto: ela exige uma
// chamada autenticada a mais (beneficiário e pagador não vêm no pedido), e
// quem paga pelo app do banco só precisa da linha digitável.
export default function Boleto({ order }) {
  const { toast } = useApp();
  const [copied, setCopied] = useState(false);
  const [ficha, setFicha] = useState(null);
  const [carregando, setCarregando] = useState(false);

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

  const abrirFicha = async () => {
    setCarregando(true);
    try {
      setFicha(await api.boletoDocument(order.id));
    } catch (e) {
      toast(e.message || "Não foi possível montar o boleto", "err");
    } finally {
      setCarregando(false);
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
      <div className="boleto-doc-acoes" style={{ marginTop: 8 }}>
        <button className="btn btn--sm" onClick={copy}>
          {copied ? "copiado ✓" : "copiar linha digitável"}
        </button>
        <button className="btn btn--sm" onClick={abrirFicha} disabled={carregando}>
          {carregando ? "montando…" : "ver boleto / salvar PDF"}
        </button>
      </div>

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

      {ficha && <FichaModal ficha={ficha} onClose={() => setFicha(null)} />}
    </div>
  );
}

// O PDF sai da própria impressão do navegador ("Salvar como PDF"): o CSS de
// `@media print` deixa só a ficha no papel. É o caminho que gera um PDF com
// texto selecionável e o código de barras em vetor -- uma biblioteca de PDF
// rasterizaria as barras, que é justamente o que não pode.
//
// Sai por portal no `body`, e não dentro do `#root`, porque é isso que permite
// à impressão esconder a aplicação inteira de uma vez. Dentro do #root, a
// página do checkout continuaria ocupando espaço (invisível, mas ocupando) e
// sairia uma folha em branco antes do boleto.
export function FichaModal({ ficha, onClose }) {
  useEscape(onClose);

  return createPortal(
    <>
      <div className="overlay no-print" onClick={onClose} />
      <div className="modal">
        <div
          className="modal__card"
          style={{ gridTemplateColumns: "1fr", width: "min(780px, 100%)" }}
        >
          <div className="modal__body">
            <div
              className="drawer__head no-print"
              style={{ padding: 0, marginBottom: 14, borderBottom: "none" }}
            >
              <h3 style={{ fontSize: 22 }}>Boleto do pedido #{ficha.order_id}</h3>
              <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
            </div>

            <BoletoDocumento ficha={ficha} />

            <div className="boleto-doc-acoes no-print" style={{ marginTop: 14 }}>
              <button className="btn btn--primary" onClick={() => window.print()}>
                Salvar PDF / imprimir
              </button>
              <button className="btn" onClick={onClose}>Fechar</button>
            </div>
            <p className="muted no-print" style={{ fontSize: 12, marginTop: 10 }}>
              Na janela de impressão, escolha <strong>Salvar como PDF</strong> no
              destino.
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
