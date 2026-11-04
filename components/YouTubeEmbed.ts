import { Node, mergeAttributes } from "@tiptap/core";
import { youtubeId } from "@/lib/youtube";

/**
 * A YouTube video block for the editor. It is saved as a plain link on its own line,
 * which the reading page turns into an embedded player.
 */
export const YouTubeEmbed = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return { id: { default: null } };
  },
  parseHTML() {
    return [{ tag: "div[data-youtube-id]", getAttrs: (el) => ({ id: (el as HTMLElement).getAttribute("data-youtube-id") }) }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-youtube-id": node.attrs.id, class: "yt-embed" }),
      ["iframe", { src: `https://www.youtube-nocookie.com/embed/${node.attrs.id}`, title: "YouTube video", frameborder: "0", tabindex: "-1" }],
    ];
  },
  addStorage() {
    return {
      markdown: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serialize(state: any, node: any) {
          state.write(`https://www.youtube.com/watch?v=${node.attrs.id}`);
          state.closeBlock(node);
        },
        parse: {
          // a paragraph that holds only a YouTube link becomes a video block
          updateDOM(element: HTMLElement) {
            element.querySelectorAll("p").forEach((p) => {
              const a = p.children.length === 1 && p.firstElementChild?.tagName === "A" ? (p.firstElementChild as HTMLAnchorElement) : null;
              const href = a?.getAttribute("href") ?? "";
              if (a && p.textContent?.trim() === href) {
                const id = youtubeId(href);
                if (id) {
                  const d = element.ownerDocument.createElement("div");
                  d.setAttribute("data-youtube-id", id);
                  p.replaceWith(d);
                }
              }
            });
          },
        },
      },
    };
  },
});
