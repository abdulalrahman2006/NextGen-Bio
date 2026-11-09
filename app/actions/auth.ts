"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string };

export async function signOut() {
  await createClient().auth.signOut();
  redirect("/");
}
export async function signIn(_: unknown, fd: FormData): Promise<AuthState> {
  const { error } = await createClient().auth.signInWithPassword({
    email: String(fd.get("email")), password: String(fd.get("password")),
  });
  if (error) return { error: error.message };
  redirect(String(fd.get("next") || "/"));
}
export async function signUp(_: unknown, fd: FormData): Promise<AuthState> {
  const { data, error } = await createClient().auth.signUp({
    email: String(fd.get("email")), password: String(fd.get("password")),
    options: { data: { full_name: String(fd.get("full_name") || "") } },
  });
  if (error) return { error: error.message };
  if (!data.session) return { info: "Account created. Check your email for a confirmation link, then sign in." };
  redirect("/");
}
