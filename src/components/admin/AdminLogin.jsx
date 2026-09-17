import { useState } from "react";
import { adminToken, api, ApiError } from "../../api";

// Porta do painel: troca a senha do admin por um token, guardado no navegador.
export default function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token } = await api.adminLogin(password);
      adminToken.set(token);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha no acesso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2 className="panel__title">Acesso restrito</h2>
      <p className="panel__hint">O painel administrativo exige a senha do lojista.</p>
      <form onSubmit={submit} className="stack">
        <div className="field">
          <label className="label">Senha do admin</label>
          <input
            className="input"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="badge badge--danger">{error}</p>}
        <button className="btn btn--primary btn--block" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar no painel"}
        </button>
      </form>
    </div>
  );
}
