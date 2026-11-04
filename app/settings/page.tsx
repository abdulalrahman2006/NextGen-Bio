import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { getProfile } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const revalidate = 0;

export default async function Settings() {
  const { user, profile } = await getProfile();
  if (!user || !profile) redirect("/login?next=/settings");
  return (
    <section className="pt-28 pr-6 max-w-2xl pb-24">
      <h1 className="mb-10 text-4xl font-black tracking-tight md:text-6xl">Your profile</h1>
      <ProfileForm profile={profile as Profile} />
    </section>
  );
}
