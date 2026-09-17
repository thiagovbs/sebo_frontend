import { brl } from "../api";

export default function ProductCard({ product, index = 0, onOpen }) {
  const out = product.stock <= 0;
  return (
    <article
      className="card"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
      onClick={() => onOpen(product)}
    >
      <div className="card__cover">
        {product.category && <span className="badge card__cat">{product.category}</span>}
        <img
          src={product.image_url || fallbackCover(product)}
          alt={`Capa de ${product.name}`}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = fallbackCover(product); }}
        />
      </div>
      <div className="card__body">
        <h3 className="card__title">{product.name}</h3>
        {product.brand && <span className="card__author">{product.brand}</span>}
        <div className="card__foot">
          <span className="price"><small>R$</small>{brl(product.price).replace("R$", "").trim()}</span>
          <span className={`stock-note ${out ? "out" : ""}`}>
            {out ? "esgotado" : `${product.stock} em estoque`}
          </span>
        </div>
      </div>
    </article>
  );
}

// Imagem de reserva quando o produto não tem foto: um cartão neutro com as
// iniciais (serve para qualquer categoria, não só livros).
function fallbackCover(product) {
  const initials = (product.name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'>
    <rect width='500' height='500' fill='#2a2119'/>
    <text x='250' y='285' font-family='Georgia, serif' font-size='150' fill='#d7ab5a' text-anchor='middle'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
