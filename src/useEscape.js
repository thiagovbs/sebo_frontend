import { useEffect } from "react";

// Fecha um overlay (modal/drawer) quando o usuário pressiona Escape.
export function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}
