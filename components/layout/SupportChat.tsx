"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { splitReply, linkLabel } from "@/lib/support-chat/format";
import type { ChatMessage } from "@/lib/support-chat/guard";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH } from "@/lib/support-chat/guard";

const STORAGE_KEY = "tm-support-chat";

const GREETING =
  "Hi! I'm the TrendyMall assistant. Ask me about products, delivery, returns or your order.\nසිංහලෙන් අහන්නත් පුළුවන්.\nதமிழிலும் கேட்கலாம்.";

const SUGGESTIONS = ["Delivery charges?", "Track my order", "Return policy", "Best earbuds under Rs 5,000"];

interface StoredChat {
  conversationId: string | null;
  messages: ChatMessage[];
}

// sessionStorage, not localStorage: a conversation should survive moving
// between pages, not linger on a shared device for the next visitor. Every
// access is guarded because private modes and blocked storage throw.
function loadChat(): StoredChat {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredChat;
      if (Array.isArray(parsed.messages)) return parsed;
    }
  } catch {}
  return { conversationId: null, messages: [] };
}

function saveChat(chat: StoredChat) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chat));
  } catch {}
}

function ReplyText({ text }: { text: string }) {
  return (
    <>
      {splitReply(text).map((segment, i) =>
        segment.type === "link" ? (
          <a
            key={i}
            href={segment.href}
            target={segment.href.includes("wa.me") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="font-semibold break-all underline underline-offset-2"
          >
            {linkLabel(segment.href)}
          </a>
        ) : (
          <span key={i}>{segment.value}</span>
        ),
      )}
    </>
  );
}

export function SupportChat({ whatsappUrl }: { whatsappUrl: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<StoredChat>({ conversationId: null, messages: [] });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadedRef = useRef(false);

  // The saved conversation is read on first open rather than on mount, so
  // the closed button costs nothing and server and client render the same.
  function openChat() {
    if (!loadedRef.current) {
      loadedRef.current = true;
      setChat(loadChat());
    }
    setOpen(true);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [chat.messages, sending, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Same rule as WhatsAppButton: nothing floats over the checkout's
  // Place Order button.
  if (pathname?.startsWith("/checkout")) return null;

  async function send(text: string) {
    const content = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!content || sending) return;

    const messages: ChatMessage[] = [...chat.messages, { role: "user", content }];
    const pending = { ...chat, messages };
    setChat(pending);
    saveChat(pending);
    setInput("");
    setSending(true);

    let reply = "Sorry, something went wrong. Please try again, or message us on WhatsApp.";
    let conversationId = chat.conversationId;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messages: messages.slice(-MAX_HISTORY_MESSAGES) }),
      });
      const data = (await res.json().catch(() => null)) as { reply?: string; conversationId?: string } | null;
      if (data?.reply) reply = data.reply;
      if (data?.conversationId) conversationId = data.conversationId;
    } catch {}

    const next: StoredChat = { conversationId, messages: [...messages, { role: "assistant", content: reply }] };
    setChat(next);
    saveChat(next);
    setSending(false);
  }

  const fabBottom =
    "calc(var(--whatsapp-fab-bottom-base) + 4.25rem + env(safe-area-inset-bottom) + var(--mobile-bottom-bar-offset, 0px) + var(--pdp-floating-bar-height, 0px))";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openChat}
          aria-label="Chat with TrendyMall assistant"
          className="transition-brand fixed right-5 z-[var(--z-whatsapp)] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-btn-primary)] text-white shadow-[0_10px_40px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 motion-reduce:transform-none print:hidden sm:right-8"
          style={{ bottom: fabBottom }}
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="TrendyMall assistant"
          className="fixed inset-x-0 bottom-0 z-[var(--z-drawer-panel)] flex h-[85dvh] flex-col overflow-hidden rounded-t-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] shadow-[0_16px_48px_rgba(0,0,0,0.18)] print:hidden sm:inset-x-auto sm:right-8 sm:bottom-8 sm:h-[min(600px,calc(100dvh-4rem))] sm:w-[380px] sm:rounded-[var(--radius-lg)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div>
              <p className="font-[family-name:var(--font-manrope)] text-sm font-extrabold text-[var(--foreground)]">
                TrendyMall Assistant
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">English · සිංහල · தமிழ்</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-2 text-[var(--color-text-secondary)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <div className="max-w-[85%] rounded-[var(--radius-md)] rounded-tl-sm bg-[var(--background)] px-3 py-2 text-sm whitespace-pre-line text-[var(--foreground)]">
              {GREETING}
            </div>

            {chat.messages.map((message, i) =>
              message.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto max-w-[85%] rounded-[var(--radius-md)] rounded-tr-sm bg-[var(--color-btn-primary)] px-3 py-2 text-sm whitespace-pre-line text-white"
                >
                  {message.content}
                </div>
              ) : (
                <div
                  key={i}
                  className="max-w-[85%] rounded-[var(--radius-md)] rounded-tl-sm bg-[var(--background)] px-3 py-2 text-sm whitespace-pre-line text-[var(--foreground)]"
                >
                  <ReplyText text={message.content} />
                </div>
              ),
            )}

            {sending && (
              <div className="flex w-16 items-center justify-center gap-1 rounded-[var(--radius-md)] bg-[var(--background)] px-3 py-3" aria-label="Assistant is typing">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-text-secondary)] motion-reduce:animate-none"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            )}

            {chat.messages.length === 0 && !sending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--background)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="border-t border-[var(--border)] px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Type your question…"
                aria-label="Your message"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--color-card)] px-3 py-2.5 text-base text-[var(--foreground)] outline-none focus:border-[var(--foreground)] sm:text-sm"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-[var(--color-btn-primary)] text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-40"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-[var(--color-text-secondary)]">
              Automated assistant, answers may not always be perfect.{" "}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                Chat with our team on WhatsApp
              </a>
            </p>
          </form>
        </div>
      )}
    </>
  );
}
