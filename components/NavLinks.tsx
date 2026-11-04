"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";

type Props = { signedIn: boolean; userId: string | null; staff: boolean; unread: number; signOutAction: () => Promise<void> };

export default function NavLinks({ signedIn, userId, staff, unread, signOutAction }: Props) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [shown, setShown] = useState(true);
  const lastY = useRef(0);
  const mouseY = useRef(9999);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => { setMenu(false); setAccount(false); setShown(true); }, [path]);
  // The bar slides away while you read. With a mouse it returns when the pointer goes near the top;
  // on a touch screen it returns when you scroll up. It always shows at the top of the page.
  useEffect(() => {
    const touch = window.matchMedia("(hover: none)").matches;
    const onScroll = () => {
      const y = window.scrollY; const dy = y - lastY.current; lastY.current = y;
      setScrolled(y > 24);
      if (y <= 24) setShown(true);
      else if (touch) { if (dy < -8) setShown(true); else if (dy > 8) setShown(false); }
      else if (dy > 8 && mouseY.current > 70) setShown(false);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouseY.current = e.clientY;
      if (e.clientY < 70) { clearTimeout(timer.current); setShown(true); }
      else if (window.scrollY > 24 && e.clientY > 130) { clearTimeout(timer.current); timer.current = setTimeout(() => setShown(false), 350); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("pointermove", onMove); clearTimeout(timer.current); };
  }, []);
  const visible = shown || menu || account;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); setAccount(false); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const main: [string, string][] = [["Articles", "/articles"], ["Podcast", "/podcast"], ["About", "/about"], ["Search", "/search"]];
  const mine: [string, string][] = signedIn && userId
    ? [["Profile", `/u/${userId}`], [unread > 0 ? `My posts (${unread} new)` : "My posts", "/my-posts"], ["Edit profile", "/settings"], ["Feedback", "/feedback"], ...(staff ? ([["Admin", "/admin"]] as [string, string][]) : [])]
    : [];
  const dot = unread > 0 ? <span aria-hidden className="ml-1 inline-block h-2 w-2 rounded-full bg-gold align-middle" /> : null;
  const tbtn = "flex h-8 w-8 items-center justify-center";

  return (
    <>
      {/* At the top of a page the bar blends with what is behind it (dark text on light pages, light text on dark pages).
          Once you scroll it gets a solid background so words never overlap. */}
      <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-30 h-[3px] bg-gold/80 transition-opacity duration-300 ${visible ? "opacity-0" : "opacity-100"}`} />
      <div onFocusCapture={() => setShown(true)}
        className={`fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 transition-transform duration-300 md:px-8 ${visible ? "translate-y-0" : "-translate-y-full"} ${scrolled ? "border-b border-slate3 bg-paper/95 text-slate9 backdrop-blur" : "text-snow mix-blend-difference"}`}>
        <Link href="/" className="text-lg font-black tracking-tighter">NEXTGEN BIO</Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-semibold md:flex">
          {main.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          {signedIn ? (
            <>
              <Link href="/create">Write</Link>
              <button aria-expanded={account} aria-haspopup="menu" onClick={() => setAccount(!account)}>Account{dot}</button>
            </>
          ) : <Link href="/login">Sign in</Link>}
          <ThemeToggle className={tbtn} />
        </nav>
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle className={tbtn} />
          <button className="text-sm font-semibold" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(!menu)}>
            {menu ? "Close" : <>Menu{dot}</>}
          </button>
        </div>
      </div>

      {account && (
        <>
          <button aria-label="Close account menu" tabIndex={-1} className="fixed inset-0 z-30 hidden cursor-default md:block" onClick={() => setAccount(false)} />
          <div role="menu" className="surface-dark fixed right-8 top-12 z-50 hidden w-56 bg-slate9 p-3 text-sm text-paper shadow-lg md:block">
            {mine.map(([label, href]) => <Link key={href} href={href} role="menuitem" className="block px-2 py-2 hover:bg-slate7">{label}</Link>)}
            <form action={signOutAction}><button role="menuitem" className="block w-full px-2 py-2 text-left hover:bg-slate7">Sign out</button></form>
          </div>
        </>
      )}

      {menu && (
        <nav id="mobile-menu" aria-label="Mobile" className="surface-dark fixed inset-x-0 top-0 z-30 max-h-screen overflow-y-auto bg-slate9 px-6 pb-8 pt-16 text-paper md:hidden">
          {[...main, ...(signedIn ? ([["Write", "/create"]] as [string, string][]) : []), ...mine].map(([label, href]) => (
            <Link key={href} href={href} className="block border-b border-slate7 py-3 text-xl font-bold">{label}</Link>
          ))}
          {signedIn
            ? <form action={signOutAction}><button className="block w-full py-3 text-left text-xl font-bold">Sign out</button></form>
            : <Link href="/login" className="block py-3 text-xl font-bold">Sign in</Link>}
        </nav>
      )}
    </>
  );
}
