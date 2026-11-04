export default function Avatar({ url, name, size = 40 }: { url?: string | null; name?: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />
  ) : (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.4 }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate7 font-bold text-paper">{initials}</span>
  );
}
