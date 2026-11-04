"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Switches between light and dark mode and remembers the choice on this device. */
export default function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("nb-theme", next ? "dark" : "light"); } catch { /* storage unavailable */ }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"} className={className}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
