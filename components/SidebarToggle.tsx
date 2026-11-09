"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

/** Shows or hides the left sidebar and remembers the choice on this device. Desktop only (the sidebar itself is desktop-only). */
export default function SidebarToggle({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(document.documentElement.classList.contains("sidebar-collapsed")); }, []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.classList.toggle("sidebar-collapsed", next);
    try { localStorage.setItem("nb-sidebar", next ? "collapsed" : "open"); } catch { /* storage unavailable */ }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={collapsed} aria-label={collapsed ? "Open sidebar" : "Close sidebar"} title={collapsed ? "Open sidebar" : "Close sidebar"}
      className={className}>
      {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
    </button>
  );
}
