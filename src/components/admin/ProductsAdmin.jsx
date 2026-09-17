import { useEffect, useState } from "react";
import { api, ApiError, brl } from "../../api";
import { useApp } from "../../context/AppContext";

const blank = {
  name: "", brand: "", category: "", price: "", stock: "",
  condition: "novo", image_url: "", description: "", active: true,
};

export default function ProductsAdmin() {
  const { toast } = useApp();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-enviar o mesmo arquivo depois
    if (!file) return;
    setUploading(true);
    try {
      // O backend recebe o arquivo, converte para base64 (data URI) e devolve;
      // o data URI vira o image_url e fica gravado no banco ao salvar.
      const { image_url } = await api.uploadProductImage(file);
      setForm((f) => ({ ...f, image_url }));
      toast("Imagem carregada");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Falha no upload", "err");
    } finally {
      setUploading(false);
    }
  };

  const load = () =>
    api
      .listProducts({ include_inactive: true, page_size: 200, sort: "nome" })
      .then((d) => setProducts(d.items))
      .catch(() => {});
  useEffect(() => { load(); }, []);

  const edit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name, brand: p.brand, category: p.category,
      price: String(p.price), stock: String(p.stock), condition: p.condition,
      image_url: p.image_url, description: p.description, active: p.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => { setEditingId(null); setForm(blank); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock, 10) || 0,
    };
    try {
      if (editingId) {
        await api.updateProduct(editingId, body);
        toast("Produto atualizado");
      } else {
        await api.createProduct(body);
        toast("Produto cadastrado");
      }
      reset();
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Falha ao salvar", "err");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    await api.deleteProduct(p.id);
    toast(`"${p.name}" desativado`);
    load();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="two-col">
      <div>
        <div className="panel">
          <h2 className="panel__title">{products.length} produto(s)</h2>
          <p className="panel__hint">Inclui inativos. Clique para editar.</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Produto</th><th>Categoria</th><th className="num">Preço</th><th className="num">Estoque</th><th></th></tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="list-item__meta">{p.brand}{p.active ? "" : " · inativo"}</div>
                    </td>
                    <td>{p.category}</td>
                    <td className="num">{brl(p.price)}</td>
                    <td className="num">{p.stock}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => edit(p)}>editar</button>
                      {p.active && (
                        <button className="btn btn--ghost btn--sm" style={{ color: "var(--danger)" }} onClick={() => remove(p)}>
                          desativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">{editingId ? "Editar produto" : "Novo produto"}</h2>
        <p className="panel__hint">Categoria, preço e condição são o que a vitrine usa para filtrar e ordenar.</p>
        <form onSubmit={submit} className="stack">
          <div className="field">
            <label className="label">Nome *</label>
            <input className="input" required value={form.name} onChange={set("name")} placeholder="Ex.: Fone Bluetooth XZ-500" />
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Marca</label>
              <input className="input" value={form.brand} onChange={set("brand")} />
            </div>
            <div className="field">
              <label className="label">Categoria</label>
              <input className="input" value={form.category} onChange={set("category")} placeholder="Ex.: Eletrônicos" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Preço (R$) *</label>
              <input className="input" type="number" step="0.01" min="0" required value={form.price} onChange={set("price")} />
            </div>
            <div className="field">
              <label className="label">Estoque</label>
              <input className="input" type="number" min="0" value={form.stock} onChange={set("stock")} />
            </div>
            <div className="field">
              <label className="label">Condição</label>
              <select className="select" value={form.condition} onChange={set("condition")}>
                <option value="novo">novo</option>
                <option value="seminovo">seminovo</option>
                <option value="usado - ótimo estado">usado - ótimo estado</option>
                <option value="usado - bom estado">usado - bom estado</option>
                <option value="usado">usado</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label">Imagem</label>
            <input
              className="input"
              value={form.image_url.startsWith("data:") ? "" : form.image_url}
              onChange={set("image_url")}
              placeholder="Cole o link da imagem (https://…)"
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <label className="btn btn--sm" style={{ cursor: "pointer" }}>
                {uploading ? "Enviando…" : "📁 Enviar do computador"}
                <input type="file" accept="image/*" hidden onChange={onPickFile} disabled={uploading} />
              </label>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {form.image_url.startsWith("data:")
                  ? "imagem enviada (salva no banco)"
                  : "PNG, JPG… até 3 MB"}
              </span>
            </div>
            {form.image_url && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <img
                  src={form.image_url}
                  alt="Pré-visualização"
                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}
                />
                <button type="button" className="btn btn--ghost btn--sm" style={{ color: "var(--danger)" }} onClick={() => setForm({ ...form, image_url: "" })}>
                  remover imagem
                </button>
              </div>
            )}
          </div>
          <div className="field">
            <label className="label">Descrição</label>
            <textarea className="input" rows={3} value={form.description} onChange={set("description")} />
          </div>
          <div className="row">
            {editingId && <button type="button" className="btn" onClick={reset}>Cancelar</button>}
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
