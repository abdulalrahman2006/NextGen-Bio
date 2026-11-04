import { redirect } from "next/navigation";
import PostForm from "@/components/PostForm";
import { getProfile } from "@/lib/supabase/server";

export default async function Create() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login?next=/create");
  const isStaff = profile ? ["admin", "editor"].includes(profile.role) : false;
  return (
    <section className="pt-28 pr-6 max-w-3xl pb-24">
      <h1 className="mb-10 text-4xl font-black tracking-tight md:text-6xl">Write</h1>
      <PostForm isStaff={isStaff} autoPublish={isStaff || !!profile?.trusted} />
    </section>
  );
}
