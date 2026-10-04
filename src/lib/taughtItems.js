// DeepBench v7.0.770 | taughtItems.js | AGT-344
// The facts the Personnel file's Training tab shows about what an agent was taught: the screen's
// entry shape, the strip's three counts, a taught card's chips and line, and the note form's count
// line. Pure and import-free, so the screen and its test read the same answers.

// Mirrors lib/read-taught.js: a taught item this long or shorter is given on every run.
export const ALWAYS_MAX_CHARS = 12000;

const num = n => n.toLocaleString("en-US");

export function toEntry(e) {
  const content = e.content || "";
  const chars = content.length;
  return {
    id:            e.id,
    title:         e.title,
    category:      e.category,
    jurisdiction:  e.jurisdiction,
    priority:      e.priority,
    triggers:      e.triggers || [],
    status:        e.status,
    fieldNotes:    e.teaching_note || "",
    learnedSummary: content,
    createdAt:     e.created_at || "",
    isDemo:        false,
    content,
    kind:          e.kind === "note" ? "note" : "file",
    taught:        e.source_type === "user",
    chars,
    always:        chars <= ALWAYS_MAX_CHARS,
  };
}

export function taughtCounts(entries) {
  const taught = entries.filter(e => e.taught);
  const given = taught.filter(e => e.status === "active");
  return {
    taught:   taught.length,
    always:   given.filter(e => e.always).length,
    lookedUp: given.filter(e => !e.always).length,
  };
}

export function cardFacts(entry, firstName) {
  return {
    kind:  entry.kind === "note" ? "NOTE" : "FILE",
    reach: entry.always ? "ALWAYS GIVEN" : "LOOKED UP BY SEARCH",
    count: entry.kind === "note" ? null : `${num(entry.chars)} characters`,
    line:  entry.always
      ? entry.content
      : `Too large to give every time. ${firstName} is told it exists and searches it when relevant.`,
  };
}

export function countLine(text) {
  const chars = (text || "").length;
  return `${num(chars)} of ${num(ALWAYS_MAX_CHARS)} characters · ${chars <= ALWAYS_MAX_CHARS ? "always given" : "looked up by search"}`;
}
