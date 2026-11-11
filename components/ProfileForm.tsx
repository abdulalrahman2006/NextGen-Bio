"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateProfile } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { shrinkImage } from "@/lib/image";
import Avatar from "./Avatar";
import type { Profile } from "@/lib/types";

function Save({ busy }: { busy: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending || busy} className="bg-slate9 text-paper px-8 py-4 font-black hover:bg-gold hover:text-night disabled:opacity-50">{pending ? "Saving…" : "Save profile"}</button>;
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useFormState(updateProfile, null as { error?: string } | null);
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const [name, setName] = useState(profile.full_name ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onPic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) { setMsg("Choose an image under 20 MB."); return; }
    setBusy(true); setMsg("Preparing and uploading…");
    const s = await shrinkImage(file, 512, 0.85);
    const sb = createClient();
    const path = `${profile.id}/avatar-${crypto.randomUUID()}.${s.ext}`;
    const { error } = await sb.storage.from("images").upload(path, s.blob, { contentType: s.type, cacheControl: "31536000" });
    setBusy(false);
    if (error) { setMsg(/not found/i.test(error.message) ? "Image storage is not set up yet. Run the step 1 SQL in Supabase." : error.message); return; }
    setAvatar(sb.storage.from("images").getPublicUrl(path).data.publicUrl); setMsg("Picture uploaded. Click Save profile to keep it.");
  }

  const f = "w-full border-2 border-slate9 bg-transparent p-3 text-lg";
  return (
    <form action={action} className="space-y-6">
      <div className="flex items-center gap-5">
        <Avatar url={avatar} name={name} size={96} />
        <div>
          <label className="block font-bold">Profile picture<input type="file" accept="image/*" onChange={onPic} className="mt-1 block font-normal" /></label>
          {avatar && <button type="button" onClick={() => setAvatar("")} className="mt-1 text-sm underline">Remove picture</button>}
          <p role="status" className="mt-1 text-sm text-slate7">{msg}</p>
        </div>
      </div>
      <input type="hidden" name="avatar_url" value={avatar} />
      <label className="block font-bold">Name<input name="full_name" dir="auto" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={f} /></label>
      <label className="block font-bold">Username
        <input name="username" required maxLength={30} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={profile.username ?? ""}
          onChange={(e) => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""); }} className={f} />
      </label>
      <p className="-mt-3 text-sm text-slate5">Your profile will be at nextgenbio.app/u/{profile.username || "your-username"}</p>
      <label className="block font-bold">Headline<input name="headline" dir="auto" maxLength={100} defaultValue={profile.headline ?? ""} placeholder="e.g. Second-year biotechnology student" className={f} /></label>
      <label className="block font-bold">About you<textarea name="bio" dir="auto" rows={5} maxLength={500} defaultValue={profile.bio ?? ""} placeholder="Interests, projects, what you like to write about" className={f} /></label>
      <label className="block font-bold">Website or link<input name="website" defaultValue={profile.website ?? ""} placeholder="https://" className={f} /></label>
      <p className="text-sm text-slate7">Your name, picture and these details are public. Your email is never shown.</p>
      {state?.error && <p role="alert" className="font-semibold text-danger">{state.error}</p>}
      <Save busy={busy} />
    </form>
  );
}
