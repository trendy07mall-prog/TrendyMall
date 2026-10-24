// Pure helpers for the support chat -- no server-only imports, so they can
// be unit tested and shared with the widget.

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ChatLanguage = "si" | "ta" | "en";

// Only the most recent turns are sent to the model: enough context for a
// follow-up ("what about the black one?"), small enough to keep each
// request well inside the free tier's token limits.
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_MESSAGE_LENGTH = 1000;

// Never trusts the browser's copy of the conversation: drops anything that
// isn't a well-formed user/assistant turn, trims and caps every message,
// keeps only the latest turns, and requires the last one to be the
// customer's (the thing being answered). Returns null when there's nothing
// valid to answer.
export function sanitizeHistory(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;

  const messages: ChatMessage[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed) continue;
    messages.push({ role, content: trimmed });
  }

  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  // The model APIs expect the conversation to open with the customer.
  while (recent.length > 0 && recent[0].role !== "user") recent.shift();
  if (recent.length === 0 || recent[recent.length - 1].role !== "user") return null;
  return recent;
}

// Script-based, so it only tells Sinhala and Tamil script apart from
// everything else -- Singlish/Tanglish (romanized) reads as "en", which is
// fine for the canned replies below; the model itself is told to answer in
// whatever language and script the customer wrote in.
export function detectLanguage(text: string): ChatLanguage {
  if (/[඀-෿]/.test(text)) return "si";
  if (/[஀-௿]/.test(text)) return "ta";
  return "en";
}

// The store owner's rule: the assistant never says what the site is built
// with or who/what is behind it, and changes the subject instead. The
// system prompt asks for that; this is the backstop for when a model slips
// anyway. Matches names that have no business appearing in a shop's
// support reply. "Google" alone is deliberately absent -- "works with
// Google Pixel" is a legitimate product answer.
const DISCLOSURE_PATTERN =
  /\b(gemini|google ai|next\.?js|vercel|supabase|postgres(ql)?|groq|openrouter|llama|open ?ai|chat ?gpt|gpt-?\d|anthropic|claude|tailwind|react(\.js)?|node\.?js|large language model|LLM|system prompt|api key)\b/i;

export function revealsInternals(reply: string): boolean {
  return DISCLOSURE_PATTERN.test(reply);
}

const REDIRECT_REPLIES: Record<ChatLanguage, string> = {
  en: "I'm TrendyMall's shopping assistant, so I can't share details about that. I'd be happy to help you find a product, check delivery charges or track your order. What are you looking for today?",
  si: "මම TrendyMall හි සාප්පු සහායකයා, ඒ ගැන විස්තර බෙදාගන්න බැහැ. නිෂ්පාදනයක් සොයන්න, බෙදාහැරීමේ ගාස්තු බලන්න හෝ ඔබේ ඇණවුම පරීක්ෂා කරන්න මට උදව් කරන්න පුළුවන්. අද ඔබ සොයන්නේ මොනවාද?",
  ta: "நான் TrendyMall இன் ஷாப்பிங் உதவியாளர், அதைப் பற்றிய விவரங்களைப் பகிர முடியாது. ஒரு பொருளைக் கண்டுபிடிக்க, டெலிவரி கட்டணத்தைப் பார்க்க அல்லது உங்கள் ஆர்டரைக் கண்காணிக்க உதவ முடியும். இன்று நீங்கள் எதைத் தேடுகிறீர்கள்?",
};

export function redirectReply(language: ChatLanguage): string {
  return REDIRECT_REPLIES[language];
}

const FAILURE_REPLIES: Record<ChatLanguage, string> = {
  en: "Sorry, I can't answer right now. Please message us on WhatsApp and our team will help you.",
  si: "සමාවන්න, මට දැන් පිළිතුරු දෙන්න බැහැ. කරුණාකර WhatsApp හරහා අපට පණිවිඩයක් එවන්න, අපේ කණ්ඩායම ඔබට උදව් කරයි.",
  ta: "மன்னிக்கவும், இப்போது பதிலளிக்க முடியவில்லை. தயவுசெய்து WhatsApp இல் எங்களுக்கு செய்தி அனுப்புங்கள், எங்கள் குழு உங்களுக்கு உதவும்.",
};

export function failureReply(language: ChatLanguage): string {
  return FAILURE_REPLIES[language];
}
