import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import PhysicsFooter from "@/components/PhysicsFooter";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "NextGen Bio", template: "%s · NextGen Bio" },
  description: "Student-written biotechnology research, ideas, experiments and podcasts.",
  openGraph: { siteName: "NextGen Bio", type: "website", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image" },
};

const themeScript = `(function(){try{var t=localStorage.getItem("nb-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}try{if(localStorage.getItem("nb-sidebar")==="collapsed")document.documentElement.classList.add("sidebar-collapsed");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <Navbar />
        <main id="app-main" className="relative pl-10 md:pl-64">{children}</main>
        <PhysicsFooter />
      </body>
    </html>
  );
}
