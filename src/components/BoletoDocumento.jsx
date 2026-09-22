import BarcodeI25 from "./BarcodeI25";

// A ficha de compensação: o boleto como ele é impresso, para virar PDF pelo
// "Salvar como PDF" da própria impressão do navegador. Sem biblioteca de PDF:
// o que o navegador imprime já é o documento, e uma dependência a mais só para
// desenhar retângulos não se paga.
//
// O documento é preto sobre branco mesmo no tema escuro -- boleto é papel, e o
// que vale é o contraste que a leitora enxerga.
//
// A tarja de DEMONSTRAÇÃO não é enfeite: os números aqui são calculados pelo
// padrão FEBRABAN de verdade, então o PDF sai convincente. Sem o carimbo,
// alguém tentaria pagá-lo -- e ele não está registrado em banco nenhum.

const data = (iso) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const dataHora = (iso) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

const dinheiro = (n) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** CPF ou CNPJ com a pontuação; qualquer outro tamanho sai como veio. */
function documento(valor) {
  const d = String(valor || "").replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return valor || "";
}

function Campo({ rotulo, children, grande = false, className = "" }) {
  return (
    <div className={`boleto-doc__campo ${className}`}>
      <span className="boleto-doc__rotulo">{rotulo}</span>
      <span className={grande ? "boleto-doc__valor boleto-doc__valor--grande" : "boleto-doc__valor"}>
        {children || "—"}
      </span>
    </div>
  );
}

export default function BoletoDocumento({ ficha }) {
  const banco = `${ficha.bank_code || "000"}-9`;
  const agenciaConta = [ficha.agency, ficha.account].filter(Boolean).join(" / ") || "—";

  return (
    <div className="boleto-doc">
      {ficha.demonstration && (
        <div className="boleto-doc__tarja" aria-hidden="true">DEMONSTRAÇÃO</div>
      )}

      <div className="boleto-doc__topo">
        <span className="boleto-doc__banco">{banco}</span>
        <span className="boleto-doc__linha">
          {ficha.digitable_line_formatted || ficha.digitable_line}
        </span>
      </div>

      <Campo rotulo="Local de pagamento">
        Pagável em qualquer banco — <strong>este boleto é de demonstração e não
        pode ser pago</strong>.
      </Campo>

      <div className="boleto-doc__grade">
        <Campo rotulo="Beneficiário" className="boleto-doc__cheio">
          {ficha.beneficiary?.name}
          {ficha.beneficiary?.document ? ` — CNPJ/CPF ${documento(ficha.beneficiary.document)}` : ""}
          {ficha.beneficiary?.address ? <div className="boleto-doc__sub">{ficha.beneficiary.address}</div> : null}
        </Campo>
        <Campo rotulo="Vencimento" grande>{data(ficha.due_date)}</Campo>
      </div>

      <div className="boleto-doc__grade boleto-doc__grade--5">
        <Campo rotulo="Agência / Código do beneficiário">{agenciaConta}</Campo>
        <Campo rotulo="Carteira">{ficha.wallet}</Campo>
        <Campo rotulo="Nosso número">{ficha.our_number}</Campo>
        <Campo rotulo="Nº do documento">{`PED-${ficha.order_id}`}</Campo>
        <Campo rotulo="Data do documento">{dataHora(ficha.issued_at)}</Campo>
      </div>

      <div className="boleto-doc__grade">
        <Campo rotulo="Espécie / Aceite / Moeda" className="boleto-doc__cheio">
          DM · Não · R$
        </Campo>
        <Campo rotulo="(=) Valor do documento" grande>{dinheiro(ficha.amount)}</Campo>
      </div>

      <Campo rotulo="Instruções (texto de responsabilidade do beneficiário)">
        <span className="boleto-doc__instrucoes">
          {ficha.instructions ? <>{ficha.instructions}<br /></> : null}
          Boleto de demonstração do Sebo On-Line: os números seguem o padrão
          FEBRABAN, mas o título não está registrado em banco nenhum e nenhum
          pagamento é compensado. Referente ao pedido #{ficha.order_id}.
        </span>
      </Campo>

      <Campo rotulo="Pagador">
        {ficha.payer?.name}
        {ficha.payer?.document ? ` — CPF/CNPJ ${documento(ficha.payer.document)}` : ""}
        {ficha.payer?.address ? <div className="boleto-doc__sub">{ficha.payer.address}</div> : null}
      </Campo>

      <div className="boleto-doc__barcode">
        <BarcodeI25 value={ficha.barcode} height={50} />
      </div>
      <p className="boleto-doc__rodape">
        Autenticação mecânica — Ficha de compensação · documento de demonstração,
        sem valor de cobrança.
      </p>
    </div>
  );
}
