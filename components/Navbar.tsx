import { getProfile } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

export default async function Navbar() {
  const { supabase, user, profile } = await getProfile();
  let unread = 0;
  if (user) {
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
    unread = count ?? 0;
  }
  // Messages re-enabled once step22.sql (chat) is run: bring back the unread-messages count
  // query here and pass unreadMessages={...} to Sidebar below.
  const staff = !!profile && ["admin", "editor"].includes(profile.role);
  return (
    <>
      <Sidebar signedIn={!!user} userId={user?.id ?? null} username={profile?.username ?? null} staff={staff} />
      <TopBar
        signedIn={!!user}
        userId={user?.id ?? null}
        username={profile?.username ?? null}
        staff={staff}
        unread={unread}
        avatarUrl={profile?.avatar_url ?? null}
        fullName={profile?.full_name ?? null}
        signOutAction={signOut}
      />
    </>
  );
}
