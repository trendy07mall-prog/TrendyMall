// Turns an assistant reply into text and link segments for the chat
// widget. Rendered as React text nodes and <a> elements, never as HTML, so
// nothing a model writes can inject markup into the page.

export type ReplySegment = { type: "text"; value: string } | { type: "link"; value: string; href: string };

const URL_PATTERN = /https?:\/\/[^\s<>()"']+/g;
// Sentence punctuation that commonly ends up glued to a URL.
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;

export function splitReply(text: string): ReplySegment[] {
  // Models sometimes use markdown emphasis despite being asked not to.
  const clean = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 $2");

  const segments: ReplySegment[] = [];
  let last = 0;
  for (const match of clean.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const url = match[0].replace(TRAILING_PUNCTUATION, "");
    if (start > last) segments.push({ type: "text", value: clean.slice(last, start) });
    segments.push({ type: "link", value: url, href: url });
    last = start + url.length;
  }
  if (last < clean.length) segments.push({ type: "text", value: clean.slice(last) });
  return segments;
}

// Product links read better as their path than the full origin.
export function linkLabel(href: string): string {
  try {
    const url = new URL(href);
    if (url.hostname === "wa.me") return "WhatsApp";
    const path = url.pathname.replace(/\/$/, "");
    return path ? `${url.hostname.replace(/^www\./, "")}${path}` : url.hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}
