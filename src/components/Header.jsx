import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";
import CustomerModal from "./CustomerModal";

export default function Header({ onOpenCart }) {
  const { theme, toggleTheme, customer, cartCount } = useApp();
  const [pickCustomer, setPickCustomer] = useState(false);

  return (
    <>
    <header className="header">
      <div className="container header__inner">
        <NavLink to="/" className="brand" aria-label="Sebo On-Line — início">
          <span className="brand__mark">Sebo<em> On-Line</em></span>
          <span className="brand__tag">novos & usados</span>
        </NavLink>

        <nav className="header__nav">
          <NavLink to="/" className={({ isActive }) => `navlink ${isActive ? "active" : ""}`} end>
            Vitrine
          </NavLink>
          <NavLink to="/conta" className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}>
            Minha conta
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}>
            Admin
          </NavLink>
        </nav>

        <div className="header__spacer" />

        <button className="btn btn--ghost" onClick={() => setPickCustomer(true)}>
          {customer ? `👤 ${customer.name || customer.email}` : "Entrar"}
        </button>

        <button className="icon-btn" onClick={toggleTheme} aria-label="Alternar tema" title="Alternar tema claro/escuro">
          {theme === "dark" ? "☀" : "☾"}
        </button>

        <button className="icon-btn" onClick={onOpenCart} aria-label="Abrir carrinho">
          🛒
          {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
        </button>
      </div>
    </header>

    {/* Fora do <header>: ele tem backdrop-filter, que viraria o bloco de
        contenção do modal fixed e ancoraria o inset:0 nos 72px do header. */}
    {pickCustomer && <CustomerModal onClose={() => setPickCustomer(false)} />}
    </>
  );
}
