import { useState } from "react";
import { brl } from "../../api";

// Receita por dia — barras verticais (magnitude ao longo do tempo), hue única.
// Rótulos em tokens de texto; a cor carrega só a magnitude. Tooltip no hover.
export default function RevenueBars({ data, height = 160 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const n = data.length;

  const totalNoPeriodo = data.reduce((s, d) => s + d.revenue, 0);
  if (totalNoPeriodo === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        Sem vendas no período ainda.
      </div>
    );
  }

  return (
    <div className="chart" style={{ position: "relative" }}>
      <div className="bars" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.revenue / max) * 100;
          const active = hover === i;
          return (
            <div
              key={d.date}
              className="bars__col"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className="bars__bar"
                style={{ height: `${h}%`, opacity: hover === null || active ? 1 : 0.55 }}
              />
            </div>
          );
        })}
      </div>

      <div className="bars__axis">
        <span>{fmtDay(data[0]?.date)}</span>
        <span>{fmtDay(data[n - 1]?.date)}</span>
      </div>

      {hover !== null && (
        <div
          className="chart-tip"
          style={{ left: `${((hover + 0.5) / n) * 100}%` }}
        >
          <strong>{brl(data[hover].revenue)}</strong>
          <span>{fmtFull(data[hover].date)}</span>
        </div>
      )}
    </div>
  );
}

function fmtDay(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
function fmtFull(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
