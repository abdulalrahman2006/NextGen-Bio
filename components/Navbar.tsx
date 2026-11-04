import { getProfile } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import NavLinks from "./NavLinks";

export default async function Navbar() {
  const { supabase, user, profile } = await getProfile();
  let unread = 0;
  if (user) {
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
    unread = count ?? 0;
  }
  return (
    <NavLinks
      signedIn={!!user}
      userId={user?.id ?? null}
      staff={!!profile && ["admin", "editor"].includes(profile.role)}
      unread={unread}
      signOutAction={signOut}
    />
  );
}
