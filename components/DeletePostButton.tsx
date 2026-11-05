"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/app/actions/posts";

/** Delete-with-confirm for a post the current user is allowed to delete (their own post, or staff). */
export default function DeletePostButton({ id, redirectTo, warnLive = false }: { id: string; redirectTo?: string; warnLive?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const router = useRouter();

  const go = () => start(async () => {
    const r = await deletePost(id);
    if (r.error) { setErr(r.error); return; }
    if (redirectTo) router.push(redirectTo); else router.refresh();
  });

  if (!confirming) {
    return <button type="button" onClick={() => setConfirming(true)} className="font-bold text-danger underline">Delete</button>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm">{warnLive ? "This is live and others may have liked or commented on it. Delete it for good?" : "Delete for good?"}</span>
      <button type="button" disabled={pending} onClick={go} className="font-bold text-danger underline disabled:opacity-50">Yes, delete</button>
      <button type="button" onClick={() => setConfirming(false)} className="underline">Cancel</button>
      {err && <span className="text-sm text-danger">{err}</span>}
    </span>
  );
}
