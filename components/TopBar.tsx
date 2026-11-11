"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, PenSquare } from "lucide-react";
import Avatar from "./Avatar";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import SidebarToggle from "./SidebarToggle";

type Props = {
  signedIn: boolean; userId: string | null; username: string | null; staff: boolean; unread: number;
  avatarUrl: string | null; fullName: string | null; signOutAction: () => Promise<void>;
};

export default function TopBar({ signedIn, userId, username, staff, unread, avatarUrl, fullName, signOutAction }: Props) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  useEffect(() => { setMenu(false); setAccount(false); }, [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); setAccount(false); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const sections: [string, string][] = [["Home", "/"], ["Articles", "/articles"], ["Podcast", "/podcast"], ["Search", "/search"], ["About", "/about"]];
  const mine: [string, string][] = signedIn && userId
    ? [["Profile", `/u/${username ?? userId}`], ["Following", "/following"], ["Library", "/library"], ["My posts", "/my-posts"], ["Edit profile", "/settings"], ["Feedback", "/feedback"], ...(staff ? ([["Admin", "/admin"]] as [string, string][]) : [])]
    // Messages re-enabled once step22.sql (chat) is run: add ["Messages", "/messages"] back above.
    : [];
  const dot = unread > 0 ? <span aria-hidden className="absolute right-0 top-0 h-2 w-2 rounded-full bg-gold" /> : null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-slate3 bg-paper px-4 text-slate9 md:px-6">
        <div className="flex items-center gap-3">
          <SidebarToggle className="hidden h-9 w-9 items-center justify-center md:flex" />
          <Link href="/" className="shrink-0 text-lg font-black tracking-tighter">NEXTGEN BIO</Link>
          <div className="hidden w-64 md:block lg:ml-4"><SearchBar tone="light" /></div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle className="hidden h-9 w-9 items-center justify-center md:flex" />
          {signedIn ? (
            <>
              <Link href="/my-posts" aria-label="Notifications" className="relative hidden h-9 w-9 items-center justify-center md:flex"><Bell size={20} />{dot}</Link>
              <Link href="/create" className="hidden items-center gap-1.5 bg-slate9 px-4 py-2 text-sm font-bold text-paper hover:bg-gold hover:text-night md:flex"><PenSquare size={16} /> Write</Link>
              <button aria-expanded={account} aria-haspopup="menu" onClick={() => setAccount(!account)} className="hidden shrink-0 md:block">
                <Avatar url={avatarUrl} name={fullName} size={34} />
              </button>
            </>
          ) : <Link href="/login" className="hidden text-sm font-bold md:block">Sign in</Link>}

          <div className="flex items-center gap-3 md:hidden">
            {signedIn && <Link href="/my-posts" aria-label="Notifications" className="relative"><Bell size={20} />{dot}</Link>}
            <button className="text-sm font-semibold" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(!menu)}>
              {menu ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </div>

      {account && (
        <>
          <button aria-label="Close account menu" tabIndex={-1} className="fixed inset-0 z-30 hidden cursor-default md:block" onClick={() => setAccount(false)} />
          <div role="menu" className="surface-dark fixed right-6 top-[68px] z-50 hidden w-56 bg-slate9 p-3 text-sm text-paper shadow-lg md:block">
            {mine.map(([label, href]) => <Link key={href} href={href} role="menuitem" className="block px-2 py-2 hover:bg-slate7">{label}</Link>)}
            <form action={signOutAction}><button role="menuitem" className="block w-full px-2 py-2 text-left hover:bg-slate7">Sign out</button></form>
          </div>
        </>
      )}

      {menu && (
        <nav id="mobile-menu" aria-label="Mobile" className="surface-dark fixed inset-x-0 top-16 z-30 max-h-[calc(100vh-4rem)] overflow-y-auto bg-slate9 px-6 pb-8 pt-4 text-paper md:hidden">
          {[...sections, ...(signedIn ? ([["Write", "/create"]] as [string, string][]) : []), ...mine].map(([label, href]) => (
            <Link key={href} href={href} className="block border-b border-slate7 py-3 text-xl font-bold">{label}</Link>
          ))}
          <div className="flex items-center justify-between py-3">
            <span className="text-xl font-bold">Appearance</span>
            <ThemeToggle className="flex h-9 w-9 items-center justify-center" />
          </div>
          {signedIn
            ? <form action={signOutAction}><button className="block w-full py-3 text-left text-xl font-bold">Sign out</button></form>
            : <Link href="/login" className="block py-3 text-xl font-bold">Sign in</Link>}
        </nav>
      )}
    </>
  );
}
