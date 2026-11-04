import { Search } from "lucide-react";

export default function SearchBar({ defaultValue = "", autoFocus = false, tone = "dark" }: { defaultValue?: string; autoFocus?: boolean; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <form action="/search" role="search" className={`flex border-b-2 ${light ? "border-slate7 focus-within:border-slate9" : "border-slate5 focus-within:border-gold"}`}>
      <label htmlFor="q" className="sr-only">Search articles and podcasts</label>
      <input id="q" dir="auto" name="q" defaultValue={defaultValue} autoFocus={autoFocus} placeholder="Search articles and podcasts"
        className={`w-full bg-transparent py-3 text-lg outline-none placeholder:text-slate5 ${light ? "text-slate9" : "text-paper"}`} />
      <button aria-label="Search" className={`px-2 ${light ? "text-slate7 hover:text-slate9" : "text-slate3 hover:text-gold"}`}><Search size={20} /></button>
    </form>
  );
}
