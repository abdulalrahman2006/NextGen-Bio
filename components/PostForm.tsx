"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { savePost, autosavePost } from "@/app/actions/posts";
import { createClient } from "@/lib/supabase/client";
import { youtubeId } from "@/lib/youtube";
import { shrinkImage } from "@/lib/image";
import RichEditor from "./RichEditor";
import type { Post } from "@/lib/types";

const MAX_BYTES = 50 * 1024 * 1024;
type FormState = { error?: string } | null;

/** Grabs a still frame from a video file to use as the disc cover. */
function videoThumb(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    const url = URL.createObjectURL(file); v.src = url;
    const done = (b: Blob | null) => { URL.revokeObjectURL(url); resolve(b); };
    v.onerror = () => done(null);
    v.onloadedmetadata = () => { v.currentTime = Math.min(2, (v.duration || 2) * 0.1); };
    v.onseeked = () => {
      const w = 640, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d")!.drawImage(v, 0, 0, w, h);
      c.toBlob((b) => done(b), "image/jpeg", 0.85);
    };
    setTimeout(() => done(null), 15000);
  });
}

function Buttons({ busy, live, canDraft, autoPublish, onPick }: { busy: boolean; live: boolean; canDraft: boolean; autoPublish: boolean; onPick: (intent: "draft" | "submit") => void }) {
  const { pending } = useFormStatus();
  const off = pending || busy;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button onClick={() => onPick("submit")} disabled={off} className="bg-slate9 px-8 py-4 font-black text-paper hover:bg-gold hover:text-night disabled:opacity-50">
        {busy ? "Please wait…" : pending ? "Saving…" : live ? (autoPublish ? "Save and publish" : "Save and send for review") : (autoPublish ? "Publish" : "Submit for review")}
      </button>
      {canDraft && (
        <button onClick={() => onPick("draft")} disabled={off} className="border-2 border-slate9 px-6 py-3.5 font-bold hover:bg-slate3/50 disabled:opacity-50">Save draft</button>
      )}
    </div>
  );
}

export default function PostForm({ post, isStaff = false, autoPublish = false }: { post?: Post; isStaff?: boolean; autoPublish?: boolean }) {
  const m = (post?.metadata ?? {}) as Record<string, unknown>;
  const live = post?.status === "published";
  const autosaveOn = !post || post.status === "draft";
  const [state, action] = useFormState(savePost as unknown as (s: FormState, fd: FormData) => Promise<FormState>, null as FormState);
  const formRef = useRef<HTMLFormElement>(null);
  const intentRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<string>(post?.post_type ?? "article");
  const [content, setContent] = useState(post?.content ?? "");
  const [tags, setTags] = useState<string[]>(post?.tags?.length ? post.tags : post?.category ? [post.category.toLowerCase()] : []);
  const [tagInput, setTagInput] = useState("");
  const [popular, setPopular] = useState<string[]>([]);

  const [mediaUrl, setMediaUrl] = useState(String(m.media_url ?? m.audio_url ?? ""));
  const [mediaType, setMediaType] = useState<"audio" | "video" | "youtube">(m.media_type === "video" ? "video" : m.media_type === "youtube" ? "youtube" : "audio");
  const [duration, setDuration] = useState(String(m.duration ?? ""));
  const [coverUrl, setCoverUrl] = useState(String(m.cover_url ?? ""));
  const [coverMsg, setCoverMsg] = useState("");
  const [up, setUp] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [upMsg, setUpMsg] = useState("");

  // ---- autosave -------------------------------------------------------------------------------
  const [postId, setPostId] = useState(post?.id ?? "");
  const postIdRef = useRef(post?.id ?? "");
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState("");
  const [saveError, setSaveError] = useState("");
  const [tick, setTick] = useState(0);
  const dirty = useRef(false);
  const submitting = useRef(false);
  const inflight = useRef(false);
  const again = useRef(false);
  const first = useRef(true);
  const markDirty = () => { dirty.current = true; setTick((t) => t + 1); };

  const runAutosave = async () => {
    if (!formRef.current || !autosaveOn || submitting.current) return;
    if (inflight.current) { again.current = true; return; }
    inflight.current = true; setSave("saving");
    const fd = new FormData(formRef.current);
    fd.set("post_id", postIdRef.current);
    try {
      const r = await autosavePost(fd);
      if (r.error) { setSave("error"); setSaveError(r.error); }
      else if (r.id) {
        postIdRef.current = r.id; setPostId(r.id); dirty.current = false;
        setSave("saved"); setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } else setSave("idle");
    } catch {
      setSave("error"); setSaveError("No connection. Your text is still here, and we will try again.");
    }
    inflight.current = false;
    if (again.current) { again.current = false; runAutosave(); }
  };
  useEffect(() => {
    if (!autosaveOn || tick === 0) return;
    const t = setTimeout(runAutosave, 3000);
    return () => clearTimeout(t);
  }, [tick]); // eslint-disable-line
  useEffect(() => { if (first.current) { first.current = false; return; } markDirty(); }, [content, tags, type, mediaUrl, mediaType, duration, coverUrl]); // eslint-disable-line
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current && !submitting.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  useEffect(() => {
    createClient().from("posts").select("tags").eq("status", "published").then(({ data }) => {
      const count = new Map<string, number>();
      (data ?? []).forEach((d) => ((d.tags as string[] | null) ?? []).forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
      setPopular([...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 12));
    });
  }, []);

  const addTag = (raw: string) => {
    const v = raw.trim().toLowerCase().slice(0, 30);
    if (!v || tags.includes(v) || tags.length >= 5) return;
    setTags([...tags, v]); setTagInput("");
  };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) { setUp("error"); setUpMsg("Choose an audio or video file such as MP3 or MP4."); return; }
    setMediaType(file.type.startsWith("video/") ? "video" : "audio");
    if (file.size > MAX_BYTES) { setUp("error"); setUpMsg("That file is over 50 MB. Export it as a smaller file and try again."); return; }
    setUp("uploading"); setUpMsg(`Uploading ${file.name}…`);
    const probe = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    probe.preload = "metadata"; probe.src = URL.createObjectURL(file);
    probe.onloadedmetadata = () => {
      if (isFinite(probe.duration)) { const s = Math.round(probe.duration); setDuration(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`); }
      URL.revokeObjectURL(probe.src);
    };
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setUp("error"); setUpMsg("Sign in to upload."); return; }
    const ext = (file.name.split(".").pop() ?? "mp3").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp3";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("audio").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) {
      setUp("error");
      setUpMsg(/not found/i.test(error.message) ? "Storage is not set up yet. Run the storage SQL in Supabase." : /row-level security|policy/i.test(error.message) ? "Upload limit reached. Delete old uploads or ask an admin." : error.message);
      return;
    }
    setMediaUrl(sb.storage.from("audio").getPublicUrl(path).data.publicUrl);
    if (file.type.startsWith("video/")) {
      const blob = await videoThumb(file);
      if (blob) {
        const tp = `${user.id}/thumb-${crypto.randomUUID()}.jpg`;
        const t = await sb.storage.from("audio").upload(tp, blob, { contentType: "image/jpeg" });
        if (!t.error) setCoverUrl((p) => p || sb.storage.from("audio").getPublicUrl(tp).data.publicUrl);
      }
    }
    setUp("done"); setUpMsg(`Uploaded ${file.name}`);
  }

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) { setCoverMsg("Choose an image under 20 MB (JPG, PNG or WebP)."); return; }
    setCoverMsg("Preparing and uploading…");
    const s = await shrinkImage(file, 1024, 0.85);
    if (s.blob.size > 5 * 1024 * 1024) { setCoverMsg("That picture is still over 5 MB after shrinking. Choose a smaller one."); return; }
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setCoverMsg("Sign in to upload."); return; }
    const path = `${user.id}/cover-${crypto.randomUUID()}.${s.ext}`;
    const { error } = await sb.storage.from("audio").upload(path, s.blob, { contentType: s.type });
    if (error) { setCoverMsg(error.message); return; }
    setCoverUrl(sb.storage.from("audio").getPublicUrl(path).data.publicUrl);
    setCoverMsg("Cover uploaded.");
  }

  const f = "w-full border-2 border-slate9 bg-transparent p-3 text-lg";
  const legacy = post && ["dataset", "protocol"].includes(post.post_type) ? [[post.post_type, post.post_type === "dataset" ? "Dataset" : "Protocol", "An older post type. You can keep editing it."]] : [];
  const types: string[][] = [
    ["article", "Article", "A full piece of writing: research, a review, an explainer."],
    ["idea", "Idea or experiment", "Something you thought of or tried. Short and informal is fine."],
    ...(isStaff || post?.post_type === "audio" ? [["audio", "Podcast episode", "Upload audio or video, or link a YouTube video."]] : []),
    ...legacy,
  ];
  const suggestions = popular.filter((p) => !tags.includes(p)).slice(0, 8);
  const pick = (intent: "draft" | "submit") => { if (intentRef.current) intentRef.current.value = intent; submitting.current = true; };

  return (
    <form ref={formRef} action={action} onInput={markDirty} onSubmit={() => { submitting.current = true; }} className="space-y-6">
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="intent" defaultValue="submit" ref={intentRef} />

      <fieldset>
        <legend className="mb-2 font-bold">What are you sharing?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {types.map(([v, name, hint]) => (
            <label key={v} className={`cursor-pointer border-2 p-4 focus-within:outline focus-within:outline-2 focus-within:outline-gold ${type === v ? "border-slate9 bg-slate9 text-paper" : "border-slate3 hover:border-slate9"}`}>
              <input type="radio" name="post_type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
              <span className="block font-black">{name}</span>
              <span className={`mt-1 block text-sm ${type === v ? "text-paper/80" : "text-slate7"}`}>{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="title" className="sr-only">Title</label>
        <input id="title" name="title" dir="auto" placeholder="Title" defaultValue={post?.title === "Untitled draft" ? "" : post?.title}
          className="w-full border-0 border-b-2 border-slate3 bg-transparent py-3 text-3xl font-black tracking-tight outline-none focus:border-slate9 md:text-5xl" />
      </div>

      {type === "audio" && (
        <div className="grid gap-4 border-2 border-slate9 p-4 sm:grid-cols-2">
          <label className="block font-bold">Guest<input name="guest" dir="auto" defaultValue={String(m.guest ?? "")} className={f} /></label>
          <label className="block font-bold">Length (minutes:seconds)
            <input name="duration" placeholder="38:10" value={duration} onChange={(e) => setDuration(e.target.value)} className={f} />
          </label>
          <div className="sm:col-span-2">
            <label className="block font-bold">Audio or video file (MP3, M4A or MP4, up to 50 MB)
              <input type="file" accept="audio/*,video/*" onChange={onFile} className="mt-1 block font-normal" />
            </label>
            <p role="status" className={`mt-2 text-sm ${up === "error" ? "font-semibold text-danger" : "text-slate7"}`}>{upMsg}</p>
            <label className="mt-3 block font-bold">Or paste a YouTube link, or a link to a hosted audio or video file
              <input name="media_url" type="url" placeholder="https://" value={mediaUrl}
                onChange={(e) => { setMediaUrl(e.target.value); setMediaType(youtubeId(e.target.value) ? "youtube" : /\.(mp4|webm|mov|m4v)(\?|$)/i.test(e.target.value) ? "video" : "audio"); }} className={f} />
              <input type="hidden" name="media_type" value={mediaType} />
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block font-bold">Cover image (optional, shown on the disc)
              <input type="file" accept="image/*" onChange={onCover} className="mt-1 block font-normal" />
            </label>
            <p className="mt-1 text-sm text-slate7">Uploaded videos and YouTube links get a thumbnail automatically. Pictures are shrunk before they upload.</p>
            {coverMsg && <p role="status" className="text-sm text-slate7">{coverMsg}</p>}
            {coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={coverUrl} alt="Cover preview" className="mt-2 h-24 w-24 rounded-full object-cover" />}
            <input type="hidden" name="cover_url" value={coverUrl} />
          </div>
          <label className="block font-bold sm:col-span-2">Timestamps, one per line
            <textarea name="notes" dir="auto" rows={5} defaultValue={Array.isArray(m.notes) ? m.notes.map(String).join("\n") : ""} placeholder={"00:00 Intro\n04:20 Main topic"} className={f} />
          </label>
          <label className="block font-bold sm:col-span-2">Transcript (optional)
            <textarea name="transcript" dir="auto" rows={8} defaultValue={String(m.transcript ?? "")} placeholder={"Paste the text of the episode. Start a line with a time to make it clickable:\n00:00 Welcome to the show"} className={f} />
            <span className="mt-1 block text-sm font-normal text-slate7">A transcript makes the episode searchable and easier to follow.</span>
          </label>
        </div>
      )}

      {type === "audio" ? (
        <label className="block font-bold">Episode description
          <textarea name="content" dir="auto" rows={10} value={content} onChange={(e) => setContent(e.target.value)} className={f} />
        </label>
      ) : (
        <div>
          <RichEditor key={type} initial={content} onChange={setContent} type={type} />
          <input type="hidden" name="content" value={content} />
        </div>
      )}

      <div>
        <label htmlFor="taginput" className="block font-bold">Tags (optional, up to 5)</label>
        <div className="flex flex-wrap items-center gap-2 border-2 border-slate9 p-2">
          {tags.map((t) => (
            <button type="button" key={t} onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="bg-slate9 px-3 py-1 text-sm text-paper">{t} ×</button>
          ))}
          <input id="taginput" dir="auto" value={tagInput} placeholder={tags.length ? "" : "Type a tag and press Enter"}
            onChange={(e) => { const v = e.target.value; if (v.endsWith(",")) addTag(v.slice(0, -1)); else setTagInput(v); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } if (e.key === "Backspace" && !tagInput) setTags(tags.slice(0, -1)); }}
            onBlur={() => addTag(tagInput)} className="min-w-40 flex-1 bg-transparent p-1 outline-none" />
        </div>
        {suggestions.length > 0 && (
          <p className="mt-2 text-sm text-slate7">Popular: {suggestions.map((p) => <button type="button" key={p} onClick={() => addTag(p)} className="mr-3 underline">{p}</button>)}</p>
        )}
        <input type="hidden" name="tags" value={tags.join(",")} />
      </div>

      {state?.error && <p role="alert" className="font-semibold text-danger">{state.error}</p>}
      <Buttons busy={up === "uploading" || save === "saving"} live={live} canDraft={!live} autoPublish={autoPublish} onPick={pick} />
      <p role="status" className={`text-sm ${save === "error" ? "font-semibold text-danger" : "text-slate7"}`}>
        {autosaveOn
          ? save === "saving" ? "Saving…" : save === "saved" ? `Draft saved at ${savedAt}. You can leave and come back from My posts.` : save === "error" ? saveError : "Your work is saved automatically as a draft once you start writing."
          : live ? (autoPublish ? "This post is live. Saving updates it right away." : "This post is live. Saving sends it back to the editors, and it stays hidden until they approve it again.")
          : (autoPublish ? "You are a trusted member, so this goes live immediately." : "Editors review every submission before it is published.")}
      </p>
    </form>
  );
}
