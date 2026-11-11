"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, Mic, Files, User, ShieldCheck, Bookmark, Users, MessageCircle, type LucideIcon } from "lucide-react";

export default function Sidebar({ signedIn, userId, username, staff, unreadMessages = 0 }: { signedIn: boolean; userId: string | null; username: string | null; staff: boolean; unreadMessages?: number }) {
  const path = usePathname();
  const items: [string, string, LucideIcon][] = [
    ["Home", "/", Home],
    ["Articles", "/articles", Newspaper],
    ["Podcast", "/podcast", Mic],
    ...(signedIn ? ([
      // ["Messages", "/messages", MessageCircle], // re-enable once step22.sql (chat) is run
      ["Following", "/following", Users],
      ["Library", "/library", Bookmark],
      ["My posts", "/my-posts", Files],
    ] as [string, string, LucideIcon][]) : []),
    ...(signedIn && userId ? ([["Profile", `/u/${username ?? userId}`, User]] as [string, string, LucideIcon][]) : []),
    ...(staff ? ([["Admin", "/admin", ShieldCheck]] as [string, string, LucideIcon][]) : []),
  ];
  const isActive = (href: string) => href === "/" ? path === "/" : path === href || path.startsWith(href + "/");

  return (
    <nav id="app-sidebar" aria-label="Sections" className="fixed bottom-0 left-0 top-16 z-20 hidden w-56 flex-col gap-1 overflow-y-auto border-r border-slate3 bg-paper px-4 py-6 md:flex">
      {items.map(([label, href, Icon]) => (
        <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 text-[15px] font-semibold ${isActive(href) ? "bg-slate9 text-paper" : "text-slate9 hover:bg-slate3/50"}`}>
          <Icon size={19} /> {label}
          {label === "Messages" && unreadMessages > 0 && <span className="ml-auto min-w-5 rounded-full bg-gold px-1.5 text-center text-xs font-bold text-night">{unreadMessages}</span>}
        </Link>
      ))}
    </nav>
  );
}
