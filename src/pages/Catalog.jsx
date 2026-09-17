import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";

const SORTS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "nome", label: "Nome (A–Z)" },
  { value: "menor_preco", label: "Menor preço" },
  { value: "maior_preco", label: "Maior preço" },
];

export default function Catalog() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recentes");
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
  }, []);

  // Debounce da busca por nome.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    api
      .listProducts({ q: debouncedQ, category, sort, page_size: 60 })
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [debouncedQ, category, sort]);

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const hasFilters = useMemo(() => q || category, [q, category]);

  return (
    <main className="container page">
      <div className="hero">
        <div>
          <h1 className="hero__title">Achados de <em>tudo</em></h1>
          <p className="hero__sub">
            Novos e usados, de eletrônicos a livros. Busque pelo nome, filtre por
            categoria e ordene do jeito que preferir.
          </p>
        </div>
        <span className="hero__count">{total} anúncio(s) no acervo</span>
      </div>

      <div className="toolbar">
        <div className="search">
          <span className="search__icon">⌕</span>
          <input
            className="input"
            placeholder="Buscar por nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button className="btn" onClick={() => { setQ(""); setCategory(""); }}>
            Limpar
          </button>
        )}
      </div>

      <div className="chips">
        <button className={`chip ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>
          Todas
        </button>
        {categories.map((c) => (
          <button key={c} className={`chip ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty__mark">🔍</div>
          <h3>Nada encontrado</h3>
          <p>Tente outro nome ou remova os filtros.</p>
        </div>
      ) : (
        <div className="grid">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onOpen={setSelected} />
          ))}
        </div>
      )}

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
