// Default homepage / about copy. Anything saved in the admin "Static pages" tab overrides these.
export const DEFAULTS: Record<string, Record<string, string>> = {
  hero: { line1: "BIOTECH RESEARCH.", line2: "DECODED." },
  intro: { text: "Student-written research, ideas, experiments and podcasts from the biotechnology community." },
  meta: {
    format: "Articles, ideas and experiments, podcasts",
    audience: "University biotechnology students",
    review: "Every post is checked by an editor before it goes live",
  },
  overview: {
    title: "Research written by the people doing it.",
    text: "NextGen Bio is a publishing platform for biotechnology students. It gives articles, ideas, experiments and podcast episodes one place to live, so good work does not stay buried in a folder or a group chat.",
  },
  problem: {
    title: "Good student work disappears after the grade.",
    text: "A good experiment gets written up for one course, shared with one professor and never seen again. Ideas sit in notebooks nobody reads. The next cohort starts from zero. Publishing should be as easy as submitting an assignment, and the result should be easy to read and cite.",
  },
  process: {
    title: "Three steps from draft to published.",
    step1_title: "Write it",
    step1_text: "Write an article, share an idea or experiment, or add a podcast episode.",
    step2_title: "Get it reviewed",
    step2_text: "An editor reads the submission, fixes typos and tightens the writing before it is published.",
    step3_title: "Publish it",
    step3_text: "The post goes into the library, where other students can read, like and comment on it.",
  },
  lab: {
    title: "Two tools from the lab.",
    text: "Interactive widgets live right in the layout. Scan a simulated genome for a CRISPR guide sequence, or watch a fermentation run drift through temperature and pH.",
  },
  library: { title: "Read the library.", text: "Published articles, ideas and experiments, filterable by topic." },
  about: {
    title: "About NextGen Bio",
    intro: "A student-run publishing platform for university biotechnology.",
    mission_title: "What we publish",
    mission_text: "Articles that explain current research, ideas and experiments worth sharing, and podcast conversations with people in the field.",
    who_title: "Who it is for",
    who_text: "Biotechnology students who want their work read, and anyone who wants to learn from them. You do not need to be an expert to follow along.",
    join_title: "Write for us.",
    join_text: "Create an account, submit your first post and an editor will review it.",
  },
};

type Row = { id?: string; section_name: string; content_json: Record<string, string> };

export function mergeSettings(rows: Row[]) {
  const out = Object.entries(DEFAULTS).map(([section_name, d]) => {
    const row = rows.find((r) => r.section_name === section_name);
    return { id: row?.id ?? section_name, section_name, content_json: { ...d, ...(row?.content_json ?? {}) } };
  });
  rows.filter((r) => !(r.section_name in DEFAULTS)).forEach((r) => out.push({ id: r.id ?? r.section_name, section_name: r.section_name, content_json: r.content_json }));
  return out;
}
export const pick = (s: ReturnType<typeof mergeSettings>, name: string) => s.find((x) => x.section_name === name)?.content_json ?? {};
