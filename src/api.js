// Cliente HTTP do backend do Sebo On-Line.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8200";

// Token do admin (painel /admin). Fica no navegador; anexado só às rotas admin.
const ADMIN_KEY = "sebo-admin-token";
export const adminToken = {
  get: () => { try { return localStorage.getItem(ADMIN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(ADMIN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(ADMIN_KEY); } catch { /* ignore */ } },
};

// Token do cliente (login com e-mail/senha). Anexado às rotas do cliente.
const CUSTOMER_KEY = "sebo-customer-token";
export const customerToken = {
  get: () => { try { return localStorage.getItem(CUSTOMER_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(CUSTOMER_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(CUSTOMER_KEY); } catch { /* ignore */ } },
};

async function request(path, { method = "GET", body, admin = false, customer = false } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (admin) {
    const t = adminToken.get();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  } else if (customer) {
    const t = customerToken.get();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data && data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail && detail.message
        ? detail.message
        : `Erro ${res.status}`;
    throw new ApiError(message, res.status, detail);
  }
  return data;
}

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export const api = {
  // Produtos / vitrine
  listProducts: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    return request(`/products?${qs.toString()}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  listCategories: () => request(`/products/categories`),
  // Upload de imagem: o backend converte para base64 (data URI) e devolve.
  uploadProductImage: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const t = adminToken.get();
    const res = await fetch(`${BASE}/products/upload-image`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : undefined,
      body: fd, // sem Content-Type: o browser define o boundary do multipart
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const d = data && data.detail;
      throw new ApiError(typeof d === "string" ? d : `Erro ${res.status}`, res.status, d);
    }
    return data;
  },
  createProduct: (body) => request(`/products`, { method: "POST", body, admin: true }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: "PUT", body, admin: true }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE", admin: true }),

  // Clientes (autenticação)
  registerCustomer: (body) => request(`/customers/register`, { method: "POST", body }),
  loginCustomer: (email, password) => request(`/customers/login`, { method: "POST", body: { email, password } }),
  getMe: () => request(`/customers/me`, { customer: true }),
  listAddresses: (id) => request(`/customers/${id}/addresses`, { customer: true }),
  addAddress: (id, body) => request(`/customers/${id}/addresses`, { method: "POST", body, customer: true }),
  deleteAddress: (id, aid) => request(`/customers/${id}/addresses/${aid}`, { method: "DELETE", customer: true }),
  listPaymentMethods: (id) => request(`/customers/${id}/payment-methods`, { customer: true }),
  addPaymentMethod: (id, body) => request(`/customers/${id}/payment-methods`, { method: "POST", body, customer: true }),
  deletePaymentMethod: (id, mid) => request(`/customers/${id}/payment-methods/${mid}`, { method: "DELETE", customer: true }),
  customerOrders: (id) => request(`/customers/${id}/orders`, { customer: true }),

  // Dispositivo (jornada JSR)
  getDevice: (id) => request(`/customers/${id}/device`, { customer: true }),
  enrollDevice: (id) => request(`/customers/${id}/device/enroll`, { method: "POST", customer: true }),

  // Carrinho
  getCart: (id) => request(`/cart/${id}`, { customer: true }),
  addToCart: (id, body) => request(`/cart/${id}/items`, { method: "POST", body, customer: true }),
  updateCartItem: (id, itemId, body) => request(`/cart/${id}/items/${itemId}`, { method: "PUT", body, customer: true }),
  removeCartItem: (id, itemId) => request(`/cart/${id}/items/${itemId}`, { method: "DELETE", customer: true }),
  clearCart: (id) => request(`/cart/${id}`, { method: "DELETE", customer: true }),

  // Pedidos
  checkout: (body) => request(`/orders/checkout`, { method: "POST", body, customer: true }),
  confirmPix: (id) => request(`/orders/${id}/confirm-pix`, { method: "POST", customer: true }),
  startOpenFinance: (id) => request(`/orders/${id}/openfinance`, { method: "POST", customer: true }),
  confirmOpenFinance: (id) => request(`/orders/${id}/confirm-openfinance`, { method: "POST", customer: true }),

  // Open Finance (status público)
  openFinanceStatus: () => request(`/open-finance/status`),

  // Admin
  adminLogin: (password) => request(`/admin/login`, { method: "POST", body: { password } }),
  adminStats: (days = 14) => request(`/admin/stats?days=${days}`, { admin: true }),
  adminOrders: () => request(`/admin/orders`, { admin: true }),
  adminCustomers: () => request(`/admin/customers`, { admin: true }),
  adminCustomer: (id) => request(`/admin/customers/${id}`, { admin: true }),
  adminDeleteDevice: (id) => request(`/admin/customers/${id}/device`, { method: "DELETE", admin: true }),
  getIntegration: () => request(`/admin/integration`, { admin: true }),
  updateIntegration: (body) => request(`/admin/integration`, { method: "PUT", body, admin: true }),
};

export const brl = (n) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
