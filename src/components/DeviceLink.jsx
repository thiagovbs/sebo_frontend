import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { useApp } from "../context/AppContext";

// No fluxo real, o cliente escolheria o próprio banco (detentora) para autenticar.
// Nesta demonstração só o Sensedia Bank está integrado, então a autenticação é
// redirecionada para a URL dele (mantendo os parâmetros do login_url original).
// Origem pública da detentora (core-banking / Sensedia Bank). A tela de login e
// consentimento é servida por ela, com seus próprios CSS e o POST de confirmação
// — por isso o redirecionamento tem que apontar para a origem do core, e não
// para o gateway de API (lá os caminhos relativos da página perderiam o prefixo).
const DETENTORA_ORIGIN = "http://34.200.109.21:3100";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"];

// Usa o login_url devolvido pela requisição **por completo** (path + query).
// Só troca o host quando ele vem como localhost (dev), preservando todo o
// caminho; se já for uma URL absoluta válida, usa como veio.
function bankAuthUrl(loginUrl) {
  if (!loginUrl) return DETENTORA_ORIGIN;
  try {
    const u = new URL(loginUrl); // absoluto
    return LOCAL_HOSTS.includes(u.hostname)
      ? DETENTORA_ORIGIN + u.pathname + u.search
      : loginUrl; // já é a URL certa: mantém como está
  } catch {
    // login_url relativo: acopla à origem da detentora com o caminho completo
    return DETENTORA_ORIGIN + (loginUrl.startsWith("/") ? "" : "/") + loginUrl;
  }
}

// Autorização de pagamento (jornada JSR). O cliente (titular da conta) autoriza
// o Sebo On-Line a iniciar PIX na conta dele — o site age como o dispositivo a
// ser autorizado. O cliente autentica no banco uma vez pelo login_url; depois
// as compras são pagas sem redirect.
export default function DeviceLink({ customerId, onRegistered, compact = false }) {
  const { toast } = useApp();
  const [device, setDevice] = useState(null);
  const [loginUrl, setLoginUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.getDevice(customerId).then((d) => {
      setDevice(d);
      if (d.status === "REGISTERED") onRegistered?.(d);
      return d;
    }).catch(() => {});

  useEffect(() => { load(); }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const enroll = async () => {
    setBusy(true);
    try {
      const { login_url } = await api.enrollDevice(customerId);
      setLoginUrl(login_url || DETENTORA_ORIGIN);
      await load();
      toast("Continue no Sensedia Bank para concluir a autorização");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Falha ao iniciar a autorização", "err");
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    const d = await load();
    setBusy(false);
    if (d?.status === "REGISTERED") toast("Pagamento por PIX autorizado!");
    else toast("Ainda não autorizado — conclua no banco", "err");
  };

  if (device === null) return <p className="muted">Verificando autorização…</p>;

  if (device.status === "REGISTERED") {
    return (
      <div className="device-ok">
        <span style={{ fontSize: 18 }}>✅</span>
        <div>
          <div style={{ fontWeight: 600 }}>Pagamento por PIX autorizado</div>
          {!compact && <div className="list-item__meta">O Sebo pode iniciar PIX na sua conta, sem redirect (JSR).</div>}
        </div>
        <span className="badge badge--ok">ativo</span>
      </div>
    );
  }

  return (
    <div className="stack">
      {!compact && (
        <p className="muted">
          Autorize o <strong>Sebo On-Line</strong> a iniciar pagamentos PIX na sua
          conta: você autentica no seu banco uma vez e este site passa a funcionar
          como um dispositivo autorizado. As compras seguintes são pagas sem redirect.
        </p>
      )}
      {!loginUrl ? (
        <button className="btn btn--primary" onClick={enroll} disabled={busy}>
          {busy ? "Iniciando…" : "Autorizar pagamento por PIX"}
        </button>
      ) : (
        <>
          <div className="bank-pick">
            <label className="label" style={{ marginBottom: 8 }}>Seu banco</label>
            <div className="bank-option">
              <span style={{ fontSize: 20 }}>🏦</span>
              <div>
                <div style={{ fontWeight: 600 }}>Sensedia Bank</div>
                <div className="list-item__meta">Parceiro exclusivo</div>
              </div>
              <span className="badge badge--accent">selecionado</span>
            </div>
          </div>
          <a className="btn btn--primary btn--block" href={bankAuthUrl(loginUrl)} target="_blank" rel="noreferrer">
            Continuar para o Sensedia Bank ↗
          </a>
          <button className="btn btn--block" onClick={recheck} disabled={busy}>
            {busy ? "Verificando…" : "Já autorizei — verificar"}
          </button>
        </>
      )}
      {device.status === "PENDING" && !loginUrl && (
        <button className="btn btn--ghost btn--sm" onClick={recheck} disabled={busy}>
          Já autorizei antes — verificar status
        </button>
      )}
    </div>
  );
}
