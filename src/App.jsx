import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import CartDrawer from "./components/CartDrawer";
import Toasts from "./components/Toasts";
import Catalog from "./pages/Catalog";
import Product from "./pages/Product";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Register from "./pages/Register";

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  return (
    <>
      <Header onOpenCart={() => setCartOpen(true)} />
      <Routes>
        <Route path="/" element={<Catalog />} />
        {/* Endereço público de um produto, pelo SKU: é o link de
            destino que os canais de anúncio exigem. */}
        <Route path="/produto/:sku" element={<Product />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/conta" element={<Account />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      <Toasts />
    </>
  );
}
