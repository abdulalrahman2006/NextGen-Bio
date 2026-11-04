"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormState, useFormStatus } from "react-dom";
import { reportContent } from "@/app/actions/moderation";

type Target = "post" | "comment" | "profile";
const NOUN: Record<Target, string> = { post: "post", comment: "comment", profile: "profile" };

function Send() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="bg-slate9 px-5 py-2 font-black text-paper hover:bg-gold hover:text-night disabled:opacity-50">{pending ? "Sending…" : "Send report"}</button>;
}

function Dialog({ targetType, targetId, onClose }: { targetType: Target; targetId: string; onClose: () => void }) {
  const [state, action] = useFormState(reportContent, null as { error?: string; ok?: boolean } | null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const f = "mt-1 w-full border-2 border-slate9 bg-transparent p-2 text-base font-normal";
  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Report this ${NOUN[targetType]}`} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-paper p-6 text-left font-sans normal-case tracking-normal text-slate9">
        <h2 className="text-2xl font-black">Report this {NOUN[targetType]}</h2>
        {state?.ok ? (
          <>
            <p className="mt-4">Thank you. An editor will review it.</p>
            <button onClick={onClose} className="mt-6 bg-slate9 px-5 py-2 font-black text-paper hover:bg-gold hover:text-night">Close</button>
          </>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <label className="block font-bold">Reason
              <select name="reason" required defaultValue="" className={f}>
                <option value="" disabled>Choose one</option>
                <option value="spam">Spam or advertising</option>
                <option value="offensive">Offensive or harassing</option>
                <option value="misinformation">Wrong or misleading science</option>
                <option value="copyright">Copyright or plagiarism</option>
                <option value="other">Something else</option>
              </select>
            </label>
            <label className="block font-bold">Details (optional)
              <textarea name="details" rows={4} maxLength={1000} className={f} />
            </label>
            {state?.error && <p role="alert" className="font-semibold text-danger">{state.error}</p>}
            <div className="flex items-center gap-4"><Send /><button type="button" onClick={onClose} className="underline">Cancel</button></div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function ReportButton({ targetType, targetId, label = "Report", className }: { targetType: Target; targetId: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "text-sm text-slate5 underline hover:text-slate9"}>{label}</button>
      {open && <Dialog targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  );
}
