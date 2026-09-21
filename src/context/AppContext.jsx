import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, customerToken } from "../api";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Estado de "nenhum método disponível", e também a forma que o resto do app
// espera de `openFinance`.
const SEM_PAGAMENTO = {
  jsr: false, redirect: false, pix_qr: false, card: false, boleto: false, available: false,
};

// Copia TUDO o que /open-finance/status devolver, como booleano. Copiar campo
// por campo era o defeito: quando cartão e boleto entraram na API, ficaram de
// fora daqui, `openFinance.boleto` era `undefined` e a opção nunca aparecia no
// checkout -- com a API respondendo que estava disponível. Assim, um método
// novo no backend passa a aparecer sem ninguém precisar lembrar deste arquivo.
const comoBooleanos = (status) => ({
  ...SEM_PAGAMENTO,
  ...Object.fromEntries(Object.entries(status ?? {}).map(([k, v]) => [k, !!v])),
});

function initialTheme() {
  const saved = localStorage.getItem("sebo-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  const [customer, setCustomer] = useState(null);
  const [cart, setCart] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [openFinance, setOpenFinance] = useState(SEM_PAGAMENTO);
  const toastId = useRef(0);

  // Métodos de pagamento disponíveis (configurados no admin).
  const refreshOpenFinance = useCallback(async () => {
    try {
      setOpenFinance(comoBooleanos(await api.openFinanceStatus()));
    } catch {
      setOpenFinance(SEM_PAGAMENTO);
    }
  }, []);
  useEffect(() => { refreshOpenFinance(); }, [refreshOpenFinance]);

  // Tema: aplica no <html> e persiste.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sebo-theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Toasts
  const toast = useCallback((message, kind = "info") => {
    const id = ++toastId.current;
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  // Cliente atual (persistido por id).
  const refreshCart = useCallback(async (customerId) => {
    const id = customerId ?? customer?.id;
    if (!id) return setCart(null);
    try {
      setCart(await api.getCart(id));
    } catch {
      setCart(null);
    }
  }, [customer]);

  // Aplica a sessão do cliente (após login ou autocadastro) e carrega o carrinho.
  const applyAuth = useCallback(async (auth) => {
    customerToken.set(auth.token);
    setCustomer(auth.customer);
    await refreshCart(auth.customer.id);
    return auth.customer;
  }, [refreshCart]);

  const login = useCallback(async (email, password) => {
    const auth = await api.loginCustomer(email, password);
    return applyAuth(auth);
  }, [applyAuth]);

  const logout = useCallback(() => {
    customerToken.clear();
    setCustomer(null);
    setCart(null);
    toast("Você saiu da conta");
  }, [toast]);

  // Restaura a sessão salva ao abrir (via token do cliente).
  useEffect(() => {
    if (!customerToken.get()) return;
    api
      .getMe()
      .then((c) => { setCustomer(c); refreshCart(c.id); })
      .catch(() => customerToken.clear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToCart = useCallback(
    async (productId, quantity = 1) => {
      if (!customer) {
        toast("Entre na sua conta para comprar", "err");
        return false;
      }
      try {
        setCart(await api.addToCart(customer.id, { product_id: productId, quantity }));
        toast("Adicionado ao carrinho");
        return true;
      } catch (e) {
        toast(e instanceof ApiError ? e.message : "Falha ao adicionar", "err");
        return false;
      }
    },
    [customer, toast]
  );

  const cartCount = useMemo(
    () => (cart?.items || []).reduce((n, i) => n + i.quantity, 0),
    [cart]
  );

  const value = {
    theme, toggleTheme,
    customer, login, applyAuth, logout,
    cart, cartCount, refreshCart, setCart, addToCart,
    openFinance, refreshOpenFinance,
    toasts, toast,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
