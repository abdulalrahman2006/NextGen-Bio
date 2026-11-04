"use client";
import { useFormState } from "react-dom";
import { useState } from "react";
import { signIn, signUp } from "@/app/actions/auth";

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action] = useFormState(mode === "in" ? signIn : signUp, null as { error?: string; info?: string } | null);
  const field = "w-full border-b-2 border-slate9 bg-transparent py-3 text-xl outline-none focus:border-gold";
  return (
    <section className="min-h-screen flex flex-col justify-center max-w-xl pr-6">
      <h1 className="mb-10 text-4xl font-black tracking-tight md:text-6xl">{mode === "in" ? "Sign in" : "Join"}</h1>
      <form action={action} className="space-y-6">
        {mode === "up" && <input name="full_name" placeholder="Full name" className={field} required />}
        <input name="email" type="email" placeholder="Email" className={field} required />
        <input name="password" type="password" placeholder="Password" minLength={6} className={field} required />
        {state?.error && <p role="alert" className="text-danger font-semibold">{state.error}</p>}
        {state?.info && <p role="status" className="text-ok font-semibold">{state.info}</p>}
        <button className="bg-slate9 text-paper px-8 py-4 font-black hover:bg-gold hover:text-night transition-colors">
          {mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 text-left underline text-slate7">
        {mode === "in" ? "No account? Join" : "Have an account? Sign in"}
      </button>
    </section>
  );
}
