import { notFound, redirect } from "next/navigation";
import ChatThread from "@/components/ChatThread";
import { getProfile } from "@/lib/supabase/server";

export default async function Conversation({ params }: { params: { userId: string } }) {
  const { supabase, user } = await getProfile();
  if (!user) redirect(`/login?next=/messages/${params.userId}`);
  if (params.userId === user.id) redirect("/messages");

  const { data: other } = await supabase.from("profiles").select("id,username,full_name,avatar_url").eq("id", params.userId).maybeSingle();
  if (!other) notFound();

  const [user_a, user_b] = user.id < params.userId ? [user.id, params.userId] : [params.userId, user.id];
  const { data: convo } = await supabase.from("conversations").select("id").eq("user_a", user_a).eq("user_b", user_b).maybeSingle();
  const { data: messages } = convo
    ? await supabase.from("messages").select("id, sender_id, content, created_at").eq("conversation_id", convo.id).order("created_at", { ascending: true })
    : { data: [] };

  const { data: iBlockedThem } = await supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", params.userId).maybeSingle();

  return (
    <ChatThread
      meId={user.id}
      other={other}
      conversationId={convo?.id ?? null}
      initialMessages={messages ?? []}
      iBlockedThem={!!iBlockedThem}
    />
  );
}
