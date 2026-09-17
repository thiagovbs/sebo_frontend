// Traduz o status do pedido para um rótulo e uma cor de badge.
const MAP = {
  CREATED: { label: "Criado", cls: "" },
  AWAITING_PAYMENT: { label: "Aguardando pagamento", cls: "badge--warn" },
  PAID: { label: "Pago", cls: "badge--ok" },
  CANCELLED: { label: "Cancelado", cls: "" },
  FAILED: { label: "Falhou", cls: "badge--danger" },
};

export default function OrderStatus({ status }) {
  const info = MAP[status] || { label: status, cls: "" };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}
