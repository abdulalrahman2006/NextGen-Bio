import { Extension } from "@tiptap/core";

/** Lets every paragraph pick its own reading direction (left-to-right or right-to-left) from its text. */
export const AutoDir = Extension.create({
  name: "autoDir",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading", "blockquote", "bulletList", "orderedList"],
      attributes: { dir: { default: "auto", parseHTML: () => "auto", renderHTML: () => ({ dir: "auto" }) } },
    }];
  },
});
