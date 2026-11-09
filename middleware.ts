import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const needsAuth = path.startsWith("/create") || path.startsWith("/admin") || path.startsWith("/feedback") || path.startsWith("/settings") || path.startsWith("/my-posts") || path.startsWith("/edit") || path.startsWith("/library") || path.startsWith("/following");
  if (needsAuth && !user) return NextResponse.redirect(new URL(`/login?next=${path}`, req.url));
  if (user && (needsAuth || path.startsWith("/admin"))) {
    const { data: p } = await supabase.from("profiles").select("role, suspended_until, suspension_reason").eq("id", user.id).single();
    if (p?.suspended_until && new Date(p.suspended_until) > new Date() && !path.startsWith("/suspended")) {
      const q = new URLSearchParams({ until: p.suspended_until, ...(p.suspension_reason ? { reason: p.suspension_reason } : {}) });
      return NextResponse.redirect(new URL(`/suspended?${q}`, req.url));
    }
    if (path.startsWith("/admin") && (!p || !["admin", "editor"].includes(p.role))) return NextResponse.redirect(new URL("/", req.url));
  }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
