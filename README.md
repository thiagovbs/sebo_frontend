# Sebo On-Line — Frontend

Vitrine do **Sebo On-Line**, a loja da demo Open Finance. SPA em **React + Vite**
que consome a API do backend ([`sebo_backend`](https://github.com/thiagovbs/sebo_backend))
e faz o checkout via **PIX Open Finance**.

**Stack:** React 18 · Vite · react-router-dom · qrcode.

## O que tem

- **Vitrine** — busca por nome, filtro por categoria e ordenação (recentes,
  nome, menor/maior preço).
- **Conta do cliente** — login (e-mail + senha) e autocadastro (`/cadastro`) com
  CPF, telefone, data de nascimento, **vários endereços** (com **CEP → ViaCEP**
  preenchendo o resto) e **vários cartões** de crédito.
- **Checkout** — três jornadas de PIX, mostradas só quando disponíveis:
  - **PIX QR clássico (copia e cola)** — exibe o BR Code para pagar no app do banco.
  - **PIX Open Finance com redirect** — na tela do QR, o botão "Autorizar no meu
    banco" leva o cliente à detentora para aprovar aquele pagamento (consentimento
    único); ao voltar, o checkout reconcilia e confirma.
  - **PIX Open Finance JSR (sem redirect)** — o cliente autoriza o Sebo uma vez e
    paga sem redirect.
- **Painel de admin** (`/admin`) — dashboard de vendas, produtos, pedidos,
  clientes e a seção de integração com a iniciadora.

## Como rodar

```bash
npm install
cp .env.example .env      # ajuste VITE_API_URL, se necessário
npm run dev
```

Sobe em `http://localhost:5173` (origem já liberada no CORS do backend).

Build de produção:

```bash
npm run build     # gera dist/
npm run preview   # serve o build localmente
```

## Configuração (`.env`)

| Variável | O que é |
|---|---|
| `VITE_API_URL` | URL do backend (padrão `http://localhost:8200`) |

No deploy (ex.: **Render**), aponte `VITE_API_URL` para a URL pública do backend.
Como é uma variável do Vite, ela é lida **no build** — rebuilde ao trocar. Lembre
de liberar a origem do frontend no `FRONTEND_ORIGIN` do backend (CORS).

## Estrutura

```
src/
├── pages/        Catalog, Account, Checkout, Register, Admin
├── components/   vitrine, carrinho, login, PIX e admin/
├── context/      AppContext (auth, carrinho, tema, toasts)
└── api.js        cliente HTTP (usa VITE_API_URL)
```
