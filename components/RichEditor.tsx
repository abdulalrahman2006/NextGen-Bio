"use client";
import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown as TiptapMarkdown } from "tiptap-markdown";
import { Bold, Heading2, Heading3, Image as ImageIcon, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2, Youtube } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { youtubeId } from "@/lib/youtube";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { AutoDir } from "./AutoDir";
import { shrinkImage } from "@/lib/image";

const PLACEHOLDER: Record<string, string> = {
  idea: "Share your idea or experiment. What did you try or imagine, and what did you learn?",
  default: "Start writing here. Use the buttons above to add headings, images, links and videos.",
};
const OUTLINE = "## The question\n\n## What I did\n\n## What happened\n\n## What I learned\n\n";
const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

function Btn({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`flex items-center gap-1 border px-2 py-1 text-sm font-bold ${active ? "border-slate9 bg-slate9 text-paper" : "border-slate3 bg-paper hover:border-slate9"}`}>
      {children}
    </button>
  );
}

/** A writing area where formatting shows as you type. The text is saved as markdown. */
export default function RichEditor({ initial, onChange, type }: { initial: string; onChange: (markdown: string) => void; type: string }) {
  const cb = useRef(onChange); cb.current = onChange;
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [words, setWords] = useState(() => countWords(initial));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      LinkExt.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      ImageExt.configure({ inline: true }),
      YouTubeEmbed,
      AutoDir,
      Placeholder.configure({ placeholder: PLACEHOLDER[type] ?? PLACEHOLDER.default }),
      TiptapMarkdown.configure({ html: false, linkify: true, breaks: false }),
    ],
    content: initial,
    editorProps: { attributes: { class: "md reading min-h-[22rem] outline-none", "aria-label": "Your story", "aria-multiline": "true" } },
    onUpdate: ({ editor: ed }) => {
      // tiptap-markdown sometimes backslash-escapes a plain space next to a bold/italic boundary
      // (to protect it), but a space isn't a real markdown escape character, so the backslash
      // shows up literally instead of disappearing when the article is rendered. Strip it here.
      const md = (ed.storage.markdown.getMarkdown() as string).replace(/\\(?=[ \u00A0])/g, "");
      cb.current(md); setWords(countWords(md));
    },
  });

  if (!editor) return <div className="min-h-[22rem] border-2 border-slate3" aria-busy="true" />;

  const link = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const raw = window.prompt("Link address (for example https://example.com)", prev ?? "https://");
    if (raw === null) return;
    let url = raw.trim();
    if (!url || url === "https://") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const video = () => {
    const url = window.prompt("Paste a YouTube link");
    if (!url) return;
    const id = youtubeId(url);
    if (!id) { setMsg("That does not look like a YouTube link."); return; }
    setMsg(""); editor.chain().focus().insertContent({ type: "youtubeEmbed", attrs: { id } }).run();
  };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 20 * 1024 * 1024) { setMsg("Choose an image (JPG, PNG, WebP or GIF) under 20 MB."); return; }
    setMsg("Preparing and uploading image…");
    const s = await shrinkImage(f, 1600, 0.82);
    if (s.blob.size > 5 * 1024 * 1024) { setMsg("That picture is still over 5 MB after shrinking. Choose a smaller one."); return; }
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setMsg("Sign in to upload images."); return; }
    const path = `${user.id}/${crypto.randomUUID()}.${s.ext}`;
    const { error } = await sb.storage.from("images").upload(path, s.blob, { contentType: s.type, cacheControl: "31536000" });
    if (error) { setMsg(/not found/i.test(error.message) ? "Image storage is not set up yet." : /row-level security|policy/i.test(error.message) ? "Image upload limit reached." : error.message); return; }
    const alt = window.prompt("Describe the image in a few words (helps people using screen readers). You can leave this empty.") ?? "";
    editor.chain().focus().setImage({ src: sb.storage.from("images").getPublicUrl(path).data.publicUrl, alt }).run();
    setMsg("");
  };

  return (
    <div>
      <div role="toolbar" aria-label="Formatting" className="sticky top-14 z-10 flex flex-wrap gap-2 border-b-2 border-slate3 bg-paper py-2">
        <Btn label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={18} /><span className="hidden sm:inline">Heading</span></Btn>
        <Btn label="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={18} /><span className="hidden sm:inline">Subheading</span></Btn>
        <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={18} /></Btn>
        <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={18} /></Btn>
        <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={18} /></Btn>
        <Btn label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={18} /></Btn>
        <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={18} /></Btn>
        <Btn label="Link" active={editor.isActive("link")} onClick={link}><Link2 size={18} /><span className="hidden sm:inline">Link</span></Btn>
        <Btn label="Add image" onClick={() => file.current?.click()}><ImageIcon size={18} /><span className="hidden sm:inline">Image</span></Btn>
        <Btn label="Add YouTube video" onClick={video}><Youtube size={18} /><span className="hidden sm:inline">Video</span></Btn>
        <span className="ml-auto flex gap-2">
          <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={18} /></Btn>
          <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={18} /></Btn>
        </span>
        <input ref={file} type="file" accept="image/*" onChange={upload} className="hidden" />
      </div>
      {type === "idea" && editor.isEmpty && (
        <button type="button" onClick={() => editor.chain().focus().setContent(OUTLINE).run()} className="mt-3 text-sm underline">Start from an experiment outline (question, what I did, what happened, what I learned)</button>
      )}
      <div className="pt-6"><EditorContent editor={editor} /></div>
      <p className="mt-4 text-sm text-slate5" role="status">{msg || `${words} words · about ${Math.max(1, Math.round(words / 220))} min read`}</p>
    </div>
  );
}
