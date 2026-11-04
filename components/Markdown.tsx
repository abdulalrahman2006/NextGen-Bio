import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { youtubeId } from "@/lib/youtube";

/** Renders post content. Raw HTML is never rendered. A YouTube link on its own line becomes a video. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p dir="auto">{children}</p>,
          h1: ({ children }) => <h1 dir="auto">{children}</h1>,
          h2: ({ children }) => <h2 dir="auto">{children}</h2>,
          h3: ({ children }) => <h3 dir="auto">{children}</h3>,
          blockquote: ({ children }) => <blockquote dir="auto">{children}</blockquote>,
          ul: ({ node: _n, ...props }) => <ul dir="auto" {...props} />,
          ol: ({ node: _n, ...props }) => <ol dir="auto" {...props} />,
          li: ({ node: _n, ...props }) => <li dir="auto" {...props} />,
          a({ href, children: kids }) {
            const text = Array.isArray(kids) ? kids.join("") : String(kids ?? "");
            const id = href ? youtubeId(href) : null;
            if (id && text === href) {
              return (
                <span className="block aspect-video w-full">
                  <iframe title="YouTube video" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`} allowFullScreen
                    allow="encrypted-media; picture-in-picture; fullscreen" className="h-full w-full border-0 bg-black" />
                </span>
              );
            }
            return <a href={href} target="_blank" rel="noopener noreferrer">{kids}</a>;
          },
          img({ src, alt }) {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
