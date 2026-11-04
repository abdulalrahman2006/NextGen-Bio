"use client";
import { useFormState, useFormStatus } from "react-dom";
import { sendFeedback } from "@/app/actions/feedback";

function Send() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="bg-slate9 text-paper px-8 py-4 font-black hover:bg-gold hover:text-night disabled:opacity-50">{pending ? "Sending…" : "Send to the admins"}</button>;
}
export default function FeedbackForm() {
  const [state, action] = useFormState(sendFeedback, null as { error?: string } | null);
  const f = "w-full border-2 border-slate9 bg-transparent p-3 text-lg";
  return (
    <form action={action} className="space-y-6">
      <label className="block font-bold">What is this about?
        <select name="kind" className={f}>
          <option value="suggestion">A suggestion</option>
          <option value="complaint">A complaint</option>
          <option value="problem">A problem with the site</option>
        </select>
      </label>
      <label className="block font-bold">Your message
        <textarea name="message" dir="auto" rows={8} required minLength={5} maxLength={2000} className={f} placeholder="Tell us what you would change, what bothered you, or what is not working." />
      </label>
      <label className="flex items-center gap-3 font-bold">
        <input type="checkbox" name="anonymous" className="h-5 w-5" /> Send anonymously (admins will not see my name)
      </label>
      {state?.error && <p role="alert" className="text-danger font-semibold">{state.error}</p>}
      <Send />
    </form>
  );
}
