"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendMessage, markRead, blockUser, unblockUser } from "@/app/actions/messages";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";
import ReportButton from "./ReportButton";

type Msg = { id: string; sender_id: string; content: string; created_at: string };
type Other = { id: string; username?: string; full_name: string | null; avatar_url: string | null };

export default function ChatThread({ meId, other, conversationId, initialMessages, iBlockedThem }: {
  meId: string; other: Other; conversationId: string | null; initialMessages: Msg[]; iBlockedThem: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [blocked, setBlocked] = useState(iBlockedThem);
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages.length]);
  useEffect(() => { markRead(other.id); }, [other.id]);

  // Live updates while this conversation is open.
  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase.channel(`messages:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const row = payload.new as Msg;
        setMessages((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row]);
        if (row.sender_id !== meId) markRead(other.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, meId, other.id]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText(""); setErr("");
    const optimistic: Msg = { id: `pending-${Date.now()}`, sender_id: meId, content: body, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    start(async () => {
      const r = await sendMessage(other.id, body);
      if (r.error) { setErr(r.error); setMessages((prev) => prev.filter((m) => m.id !== optimistic.id)); setText(body); }
    });
  };

  return (
    <section className="flex h-[calc(100vh-4rem)] max-w-2xl flex-col pr-6 pt-16">
      <div className="flex items-center justify-between gap-3 border-b border-slate3 py-4">
        <Link href={`/u/${other.username ?? other.id}`} className="flex items-center gap-3 hover:underline">
          <Avatar url={other.avatar_url} name={other.full_name} size={36} />
          <span dir="auto" className="font-bold">{other.full_name ?? "Student"}</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <ReportButton targetType="profile" targetId={other.id} className="text-slate5 underline hover:text-slate9" />
          <button className={blocked ? "font-bold text-gold underline" : "text-danger underline"} onClick={() => start(async () => {
            const r = blocked ? await unblockUser(other.id) : await blockUser(other.id);
            if (r.error) { setErr(r.error); return; }
            setBlocked(!blocked);
          })}>{blocked ? "Unblock" : "Block"}</button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === meId ? "justify-end" : "justify-start"}`}>
            <p dir="auto" className={`max-w-[75%] whitespace-pre-wrap break-words px-4 py-2 ${m.sender_id === meId ? "bg-slate9 text-paper" : "border border-slate3"}`}>{m.content}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="text-slate7">No messages yet. Say hello.</p>}
        <div ref={bottom} />
      </div>

      {blocked ? (
        <p className="border-t border-slate3 py-4 text-slate7">You've blocked {other.full_name ?? "this student"}. Unblock them to send messages again.</p>
      ) : (
        <div className="border-t border-slate3 py-4">
          {err && <p role="alert" className="mb-2 font-semibold text-danger">{err}</p>}
          <div className="flex gap-3">
            <textarea dir="auto" rows={1} value={text} maxLength={2000} placeholder="Write a message…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="flex-1 resize-none border-2 border-slate9 bg-transparent p-2 outline-none focus:border-gold" />
            <button disabled={pending || !text.trim()} onClick={send} className="bg-slate9 px-5 font-bold text-paper hover:bg-gold hover:text-night disabled:opacity-50">Send</button>
          </div>
        </div>
      )}
    </section>
  );
}
