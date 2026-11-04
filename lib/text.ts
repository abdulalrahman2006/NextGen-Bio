/** Turns markdown into a short plain-text excerpt. */
export function plain(md: string, max = 200) {
  const t = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^[ \t]*[#>*+-]+[ \t]*/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

/** First image in a markdown post, used as the list thumbnail. */
export function firstImage(md: string): string | null {
  const m = md.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/);
  return m ? m[1] : null;
}

export function readMinutes(md: string) {
  return Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 220));
}
