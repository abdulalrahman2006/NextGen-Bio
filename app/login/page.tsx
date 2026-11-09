"use client";
import Link from "next/link";
import { useFormState } from "react-dom";
import { useState } from "react";
import { signIn, signUp } from "@/app/actions/auth";

export default function Login({ searchParams }: { searchParams: { next?: string } }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action] = useFormState(mode === "in" ? signIn : signUp, null as { error?: string; info?: string } | null);
  const field = "w-full border-b-2 border-slate9 bg-transparent py-3 text-lg outline-none focus:border-gold placeholder:text-slate5";

  return (
    <div id="login-split" className="grid min-h-screen md:-ml-64 md:w-[calc(100%+16rem)] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="surface-dark bg-paper px-6 py-10 text-slate9 md:flex md:flex-col md:justify-between md:px-14 md:py-16">
        <Link href="/" className="text-sm font-black tracking-tight">NextGen Bio</Link>
        <div className="my-10 md:my-0">
          <h1 className="max-w-md text-3xl font-black leading-[1.08] tracking-tight md:text-5xl">
            Biotech research, told by the students running the experiments.
          </h1>
          <div className="mt-6 h-px w-16 bg-gold" />
          <p className="mt-6 max-w-sm text-lg text-slate7">
            Articles, lab notes and podcast conversations from Ain Shams&apos;s biotech program.
          </p>
        </div>
        <Link href="/" className="hidden text-sm text-slate7 underline md:inline-block">Back to the site</Link>
      </div>

      <div className="flex items-center px-6 py-14 md:px-14">
        <div className="w-full max-w-md">
          <div className="mb-10 flex gap-6 text-2xl font-black tracking-tight md:text-3xl">
            <button type="button" onClick={() => setMode("in")} className={mode === "in" ? "text-slate9" : "text-slate5"}>Sign in</button>
            <button type="button" onClick={() => setMode("up")} className={mode === "up" ? "text-slate9" : "text-slate5"}>Join</button>
          </div>
          <form action={action} className="space-y-6">
            <input type="hidden" name="next" value={searchParams?.next ?? "/"} />
            {mode === "up" && <input name="full_name" placeholder="Full name" className={field} required />}
            <input name="email" type="email" placeholder="Email" className={field} required />
            <input name="password" type="password" placeholder="Password" minLength={6} className={field} required />
            {state?.error && <p role="alert" className="font-semibold text-danger">{state.error}</p>}
            {state?.info && <p role="status" className="font-semibold text-ok">{state.info}</p>}
            <button className="w-full bg-slate9 px-8 py-4 font-black text-paper transition-colors hover:bg-gold hover:text-night">
              {mode === "in" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 text-left text-slate7 underline">
            {mode === "in" ? "No account? Join" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
