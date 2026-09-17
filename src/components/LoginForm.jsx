import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useApp } from "../context/AppContext";

// Formulário de login do cliente (e-mail + senha). Reutilizado no modal do topo
// e na página "Minha conta" quando ninguém está logado.
export default function LoginForm({ onSuccess, onRegister }) {
  const { login, toast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const c = await login(email, password);
      toast(`Bem-vindo(a), ${c.name || c.email}`);
      onSuccess?.(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha no login");
    } finally {
      setBusy(false);
    }
  };

  const goRegister = () => (onRegister ? onRegister() : navigate("/cadastro"));

  return (
    <form onSubmit={submit} className="stack">
      <div className="field">
        <label className="label">E-mail</label>
        <input className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
      </div>
      <div className="field">
        <label className="label">Senha</label>
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      {error && <p className="badge badge--danger">{error}</p>}
      <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <div className="center muted" style={{ fontSize: 14, marginTop: 4 }}>
        Não tem conta?{" "}
        <button type="button" className="linklike" onClick={goRegister}>Criar conta</button>
      </div>
    </form>
  );
}
