import { larguras } from "../barcode25";

// Código de barras 2 de 5 intercalado, desenhado em SVG e não em imagem: a
// leitora precisa da borda exata entre a barra fina e a grossa, que é a única
// informação que existe aqui -- e um PNG redimensionado pela impressora borra
// justamente essa diferença. Em vetor, o PDF sai na resolução do papel.
//
// A codificação está em `../barcode25`.
export default function BarcodeI25({ value, height = 50 }) {
  const larg = larguras(String(value || "").replace(/\D/g, ""));
  if (!larg) return null;

  const total = larg.reduce((a, b) => a + b, 0);
  const barras = [];
  let x = 0;
  larg.forEach((largura, i) => {
    if (i % 2 === 0) barras.push({ x, largura }); // índices pares são barras
    x += largura;
  });

  return (
    <svg
      className="boleto-doc__barras"
      viewBox={`0 0 ${total} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Código de barras do boleto: ${value}`}
    >
      <rect width={total} height={height} fill="#fff" />
      {barras.map((b) => (
        <rect key={b.x} x={b.x} y="0" width={b.largura} height={height} fill="#000" />
      ))}
    </svg>
  );
}
