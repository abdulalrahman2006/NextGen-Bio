"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendFeedback(_: unknown, fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to send feedback." };
  const kind = String(fd.get("kind"));
  if (!["suggestion", "complaint", "problem"].includes(kind)) return { error: "Choose what kind of message this is." };
  const message = String(fd.get("message") || "").trim();
  if (message.length < 5) return { error: "Write a few words so the admins understand." };
  if (message.length > 2000) return { error: "Please keep it under 2000 characters." };
  const anonymous = fd.get("anonymous") === "on";
  const { error } = await supabase.from("feedback").insert({ user_id: anonymous ? null : user.id, kind, message });
  if (error) return { error: /could not find the table|relation/i.test(error.message) ? "The feedback box is not set up yet. Ask an admin to run the feedback SQL." : error.message };
  redirect("/feedback?sent=1");
}

export async function setFeedbackStatus(id: string, status: string) {
  if (!["new", "reviewed", "resolved"].includes(status)) return { error: "Unknown status." };
  const { error, data } = await createClient().from("feedback").update({ status }).eq("id", id).select("id"); // RLS: admins only
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only admins can change this." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteFeedback(id: string) {
  const { error, data } = await createClient().from("feedback").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only admins can delete feedback." };
  revalidatePath("/admin");
  return { ok: true };
}
