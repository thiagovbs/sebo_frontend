import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { api, ApiError, brl } from "../api";
import { useApp } from "../context/AppContext";

// Pagamento por PIX QR clássico: mostra o BR Code (QR + copia e cola). O cliente
// paga no app do banco e o pedido fica aguardando -- quem confirma que o
// dinheiro caiu é a LOJA, no admin. O cliente não declara pagamento: ele não é
// quem vê o extrato.
export default function PixQr({ order }) {
  const { toast, openFinance } = useApp();
  const [dataUrl, setDataUrl] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!order?.pix_code) return;
    QRCode.toDataURL(order.pix_code, { width: 240, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [order]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.pix_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Não foi possível copiar", "err");
    }
  };

  // Jornada Open Finance com redirect: a loja cria um consentimento único na
  // iniciadora e leva o cliente ao banco para aprovar aquele pagamento.
  const payOpenFinance = async () => {
    setRedirecting(true);
    try {
      const o = await api.startOpenFinance(order.id);
      if (o.payment_login_url) {
        window.location.href = o.payment_login_url; // mesma aba: volta ao checkout
      } else {
        toast("Não foi possível iniciar o pagamento no banco", "err");
        setRedirecting(false);
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Falha ao iniciar o pagamento", "err");
      setRedirecting(false);
    }
  };

  return (
    <div className="panel center">
      <h2 className="panel__title" style={{ fontSize: 26 }}>Pague com PIX</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Pedido #{order.id} · {brl(order.total)}
      </p>

      {dataUrl && (
        <img src={dataUrl} alt="QR Code do PIX" style={{ width: 240, height: 240, margin: "0 auto", borderRadius: 8, border: "1px solid var(--line)" }} />
      )}

      <p className="muted" style={{ margin: "14px 0 6px", fontSize: 13.5 }}>
        Escaneie no app do seu banco, ou use o copia e cola:
      </p>
      <div className="pix-copia">
        <code>{order.pix_code}</code>
      </div>
      <button className="btn btn--sm" style={{ marginTop: 8 }} onClick={copy}>
        {copied ? "copiado ✓" : "copiar código"}
      </button>

      {openFinance.redirect && (
        <>
          <div className="divider" />
          <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            Ou autorize direto no seu banco pelo <strong>Open Finance</strong> — você
            revisa o valor e aprova o pagamento, sem copiar código.
          </p>
          <button className="btn btn--block" onClick={payOpenFinance} disabled={redirecting}>
            {redirecting ? "Redirecionando…" : "Autorizar no meu banco (Open Finance) ↗"}
          </button>
        </>
      )}

      <div className="divider" />

      <p className="muted" style={{ fontSize: 13 }}>
        Depois de pagar no seu banco, o pedido é liberado quando a loja
        identificar o recebimento.
      </p>
      <Link className="btn btn--primary btn--block" style={{ marginTop: 10 }} to="/conta">
        Acompanhar em Minha conta
      </Link>
    </div>
  );
}
