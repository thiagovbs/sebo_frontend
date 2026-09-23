import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, brl } from "../api";
import { useApp } from "../context/AppContext";

// Página pública de um produto, endereçada pelo SKU de quem o publicou.
//
// Existe porque canal de anúncio exige um LINK DE DESTINO por item -- o
// catálogo do Meta recusa item sem ele --, e quem publica conhece o produto
// pelo SKU, não pelo id que o banco da loja gerou. Antes desta rota, o anúncio
// só podia apontar para a vitrine inteira, e todo item caía na mesma página.
//
// É a mesma ficha do modal do catálogo, em endereço próprio: quem chega de
// fora não passou pela vitrine e precisa de tudo aqui, inclusive do caminho de
// volta para ela.
export default function Product() {
  const { sku } = useParams();
  const { addToCart } = useApp();
  const [product, setProduct] = useState(null);
  const [erro, setErro] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let vivo = true;
    setProduct(null);
    setErro("");
    api.getProductBySku(sku)
      .then((p) => { if (vivo) setProduct(p); })
      .catch((e) => {
        if (!vivo) return;
        // 404 é o caso comum: produto que saiu de linha. Dizer isso é melhor
        // que "erro ao carregar", porque o anúncio pode continuar no ar.
        setErro(e instanceof ApiError && e.status === 404
          ? "Este produto não está mais à venda."
          : "Não foi possível carregar o produto.");
      });
    return () => { vivo = false; };
  }, [sku]);

  if (erro) {
    return (
      <div className="container">
        <div className="panel center" style={{ marginTop: 32 }}>
          <h1 className="panel__title" style={{ fontSize: 26 }}>{erro}</h1>
          <Link className="btn btn--primary" style={{ marginTop: 14 }} to="/">
            Ver a vitrine
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="container"><p className="muted" style={{ marginTop: 32 }}>Carregando…</p></div>;
  }

  const esgotado = product.stock <= 0;
  const capa = product.image_url || semCapa(product);

  return (
    <div className="container">
      <p style={{ marginTop: 24 }}>
        <Link to="/" className="linklike">← Voltar para a vitrine</Link>
      </p>
      <div className="panel two-col" style={{ gap: 28, alignItems: "start" }}>
        <img
          src={capa}
          alt={`Capa de ${product.name}`}
          onError={(e) => (e.currentTarget.src = semCapa(product))}
          style={{ width: "100%", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}
        />
        <div style={{ minWidth: 0 }}>
          {product.category && <span className="badge badge--accent">{product.category}</span>}
          <h1 style={{ fontSize: 32, marginTop: 10 }}>{product.name}</h1>
          {product.brand && <p className="muted" style={{ marginTop: 4 }}>{product.brand}</p>}
          {product.condition && <p style={{ marginTop: 12 }}><span className="badge">🏷️ {product.condition}</span></p>}
          {product.description && (
              <p className="texto-longo" style={{ marginTop: 16, lineHeight: 1.6 }}>
                {product.description}
              </p>
            )}

          <div className="divider" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span className="price" style={{ fontSize: 32 }}>{brl(product.price)}</span>
            <span className={`stock-note ${esgotado ? "out" : ""}`}>
              {esgotado ? "esgotado" : `${product.stock} disponível(is)`}
            </span>
          </div>

          {!esgotado && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
              <div className="qty">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Mais">+</button>
              </div>
              <button
                className="btn btn--primary"
                style={{ flex: 1, minWidth: 200 }}
                onClick={() => addToCart(product.id, qty)}
              >
                Adicionar ao carrinho
              </button>
            </div>
          )}
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            Quem chega de um anúncio costuma não estar logado: entre na sua conta
            pelo topo da página para concluir a compra.
          </p>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>SKU {sku}</p>
        </div>
      </div>
    </div>
  );
}

function semCapa(product) {
  const iniciais = (product.name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'><rect width='500' height='500' fill='#2a2119'/><text x='250' y='285' font-family='Georgia, serif' font-size='150' fill='#d7ab5a' text-anchor='middle'>${iniciais}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
