// Pure text-processing helpers for Zen Reader, shared by index.html and tests.

export const MAX_WORDS = 80;

export function wordCount(s) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function chunkParagraph(para) {
  if (wordCount(para) <= MAX_WORDS) return [para];

  const sentences = para.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) || [para];
  const chunks = [];
  let buf = "";

  for (const raw of sentences) {
    const sent = raw.trim();
    if (!sent) continue;
    const candidate = buf ? buf + " " + sent : sent;
    if (wordCount(candidate) > MAX_WORDS && buf) {
      chunks.push(buf);
      buf = sent;
    } else {
      buf = candidate;
    }
  }
  if (buf) chunks.push(buf);

  const final = [];
  for (const chunk of chunks) {
    if (wordCount(chunk) <= MAX_WORDS) { final.push(chunk); continue; }
    const words = chunk.split(/\s+/);
    for (let i = 0; i < words.length; i += MAX_WORDS) {
      final.push(words.slice(i, i + MAX_WORDS).join(" "));
    }
  }
  return final;
}

export function splitParagraphs(text) {
  return text.split(/\n\s*\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(chunkParagraph);
}

export function makeTitle(text) {
  const firstLine = (text.split(/\n+/).find(l => l.trim()) || "").trim();
  let t = firstLine.replace(/^[#>*\-\s"'“‘»«]+/, "").trim();
  if (t.length > 120) t = t.slice(0, 117) + "…";
  return t || "untitled";
}

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Easter egg decision: when the textarea is empty, fall back to the clipboard.
// Returns the trimmed-non-empty source text, or null if neither has usable content.
export function pickBeginText(textareaValue, clipboardText) {
  if (textareaValue && textareaValue.trim()) return textareaValue;
  if (clipboardText && clipboardText.trim()) return clipboardText;
  return null;
}
