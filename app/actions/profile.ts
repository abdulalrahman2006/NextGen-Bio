"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(_: unknown, fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const full_name = String(fd.get("full_name") || "").trim().slice(0, 80);
  if (!full_name) return { error: "Your name cannot be empty." };
  const headline = String(fd.get("headline") || "").trim().slice(0, 100);
  const bio = String(fd.get("bio") || "").trim().slice(0, 500);
  let website = String(fd.get("website") || "").trim();
  if (website && !/^https?:\/\//.test(website)) website = `https://${website}`;
  if (website) { try { new URL(website); } catch { return { error: "That website link does not look right." }; } }
  const avatar = String(fd.get("avatar_url") || "").trim();
  if (avatar && !/^https?:\/\//.test(avatar)) return { error: "The picture link is not valid." };
  const { error } = await supabase.from("profiles").update({
    full_name, headline: headline || null, bio: bio || null, website: website || null, avatar_url: avatar || null,
  }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath(`/u/${user.id}`);
  redirect(`/u/${user.id}`);
}

export async function toggleFollow(userId: string): Promise<{ error?: string; following?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to follow." };
  if (userId === user.id) return { error: "You cannot follow yourself." };
  const { data: existing } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("followee_id", userId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("followee_id", userId);
    if (error) return { error: error.message };
    revalidatePath(`/u/${userId}`);
    return { following: false };
  }
  const { error } = await supabase.from("follows").insert({ follower_id: user.id, followee_id: userId });
  if (error) return { error: error.message };
  revalidatePath(`/u/${userId}`);
  return { following: true };
}
