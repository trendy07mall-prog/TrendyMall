import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  detectLanguage,
  failureReply,
  redirectReply,
  revealsInternals,
  sanitizeHistory,
  type ChatLanguage,
} from "@/lib/support-chat/guard";
import { buildSystemPrompt } from "@/lib/support-chat/prompt";
import { getSupportStoreContext } from "@/lib/support-chat/store-context";
import { SUPPORT_TOOLS, executeSupportTool } from "@/lib/support-chat/tools";
import { isSupportChatConfigured, runSupportAgent } from "@/lib/support-chat/providers";

// A reply can take a few model round trips (search, then details, then
// the answer), each capped at 20s in providers.ts.
export const maxDuration = 60;

const MAX_BODY_BYTES = 32_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATE_LIMITED_REPLIES: Record<ChatLanguage, string> = {
  en: "You've sent a lot of messages in a short time. Please wait a few minutes, or message us on WhatsApp.",
  si: "ඔබ කෙටි කාලයක් තුළ පණිවිඩ රාශියක් එවා ඇත. කරුණාකර මිනිත්තු කිහිපයක් රැඳී සිටින්න, නැතහොත් WhatsApp හරහා අපට පණිවිඩයක් එවන්න.",
  ta: "குறுகிய நேரத்தில் நிறைய செய்திகளை அனுப்பியுள்ளீர்கள். சில நிமிடங்கள் காத்திருங்கள், அல்லது WhatsApp இல் எங்களுக்கு செய்தி அனுப்புங்கள்.",
};

function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// POST { conversationId?, messages: [{ role, content }] } -> { reply, conversationId }.
// The widget keeps the conversation in the browser and sends the recent
// turns each time; nothing here trusts that copy beyond its text
// (sanitizeHistory), and the customer's latest message plus the reply are
// logged server-side for the owner to review.
export async function POST(request: Request) {
  if (!isSupportChatConfigured()) {
    return NextResponse.json({ error: "Chat is not available." }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Message too long." }, { status: 413 });
  }

  let body: { conversationId?: unknown; messages?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const history = sanitizeHistory(body.messages);
  if (!history) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const conversationId =
    typeof body.conversationId === "string" && UUID_PATTERN.test(body.conversationId)
      ? body.conversationId
      : crypto.randomUUID();
  const customerMessage = history[history.length - 1].content;
  const language = detectLanguage(customerMessage);

  const supabase = await createClient();
  const { data: allowed, error: rateLimitError } = await supabase.rpc("check_support_chat_rate_limit", {
    p_ip: getRequestIp(request),
  });
  // Fails open on a lookup error (e.g. sql/105 not run yet): a broken
  // limiter shouldn't take the chat down, and the AI providers enforce
  // their own quotas regardless.
  if (rateLimitError) console.error("[support-chat] rate limit check failed", rateLimitError);
  else if (!allowed) {
    return NextResponse.json({ reply: RATE_LIMITED_REPLIES[language], conversationId }, { status: 429 });
  }

  let reply: string;
  let provider: string;
  try {
    const store = await getSupportStoreContext();
    const result = await runSupportAgent({
      system: buildSystemPrompt(store),
      history,
      tools: SUPPORT_TOOLS,
      executeTool: executeSupportTool,
    });
    if (revealsInternals(result.reply)) {
      reply = redirectReply(language);
      provider = `${result.provider}:guard`;
    } else {
      reply = result.reply;
      provider = result.provider;
    }
  } catch (error) {
    console.error("[support-chat] no reply", error);
    reply = failureReply(language);
    provider = "error";
  }

  after(async () => {
    const { error } = await createAdminClient()
      .from("support_chat_messages")
      .insert([
        { conversation_id: conversationId, role: "user", content: customerMessage },
        { conversation_id: conversationId, role: "assistant", content: reply, provider },
      ]);
    if (error) console.error("[support-chat] log failed", error);
  });

  return NextResponse.json({ reply, conversationId });
}
