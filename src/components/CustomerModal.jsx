import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useEscape } from "../useEscape";
import LoginForm from "./LoginForm";

// Login do cliente: e-mail e senha. Quem ainda não tem conta vai para o
// autocadastro (/cadastro).
export default function CustomerModal({ onClose }) {
  const { customer, logout } = useApp();
  const navigate = useNavigate();
  useEscape(onClose);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal__card" style={{ gridTemplateColumns: "1fr", width: "min(440px, 100%)" }}>
          <div className="modal__body">
            <div className="drawer__head" style={{ padding: 0, marginBottom: 18, borderBottom: "none" }}>
              <h3 style={{ fontSize: 26 }}>Entrar</h3>
              <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
            </div>

            {customer ? (
              <div className="stack">
                <p className="muted">
                  Você está logado como <strong>{customer.name || customer.email}</strong>.
                </p>
                <button className="btn btn--block" style={{ color: "var(--danger)" }} onClick={() => { logout(); onClose(); }}>
                  Sair da conta
                </button>
              </div>
            ) : (
              <LoginForm
                onSuccess={onClose}
                onRegister={() => { onClose(); navigate("/cadastro"); }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
