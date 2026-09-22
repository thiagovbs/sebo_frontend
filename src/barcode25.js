// Codificação 2 de 5 intercalado (Interleaved 2 of 5) -- o padrão em que o
// boleto bancário é impresso. Aqui só a aritmética das larguras; o desenho
// está em `components/BarcodeI25.jsx`. Separado porque a codificação é o que
// pode estar errado de um jeito invisível: barra grossa no lugar da fina vira
// outro número, e a tela não denuncia.
//
// A codificação intercala DOIS dígitos por vez: as cinco barras saem do
// primeiro, os cinco espaços do segundo. Por isso a quantidade de dígitos
// precisa ser par -- os 44 do boleto são.

// N = estreito, W = largo. Cada dígito são cinco elementos, dois deles largos.
export const PADROES = {
  0: "NNWWN", 1: "WNNNW", 2: "NWNNW", 3: "WWNNN", 4: "NNWNW",
  5: "WNWNN", 6: "NWWNN", 7: "NNNWW", 8: "WNNWN", 9: "NWNWN",
};

export const ESTREITA = 1;
export const LARGA = 3; // proporção 1:3, a recomendada pela FEBRABAN

/**
 * Larguras dos elementos do código, alternando barra e espaço a partir da
 * barra: índice par é barra, índice ímpar é espaço.
 *
 * Devolve `null` quando os dígitos não formam um código possível (vazio,
 * quantidade ímpar, caractere que não é dígito) -- não desenhar é melhor do
 * que desenhar um código que a leitora recusa ou, pior, lê como outro número.
 */
export function larguras(valor) {
  const digitos = String(valor ?? "");
  if (!digitos || digitos.length % 2 !== 0 || !/^\d+$/.test(digitos)) return null;

  const saida = [ESTREITA, ESTREITA, ESTREITA, ESTREITA]; // início: 4 finos
  for (let i = 0; i < digitos.length; i += 2) {
    const barras = PADROES[digitos[i]];
    const espacos = PADROES[digitos[i + 1]];
    for (let j = 0; j < 5; j += 1) {
      saida.push(barras[j] === "W" ? LARGA : ESTREITA);
      saida.push(espacos[j] === "W" ? LARGA : ESTREITA);
    }
  }
  saida.push(LARGA, ESTREITA, ESTREITA); // fim: barra larga, espaço, barra
  return saida;
}
