"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, MapPin, RotateCcw, Search, Send, Truck, X } from "lucide-react";
import { splitReply, linkLabel } from "@/lib/support-chat/format";
import type { ChatMessage } from "@/lib/support-chat/guard";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH } from "@/lib/support-chat/guard";
import {
  ORDER_STEPS,
  orderProgress,
  orderStatusLabel,
  paymentMethodLabel,
  type OrderCard,
  type ProductCard,
  type ReplyCards,
} from "@/lib/support-chat/cards";
import { formatPrice } from "@/lib/utils";

const STORAGE_KEY = "tm-support-chat";
const TEASER_KEY = "tm-support-chat-teaser";

const TOPICS = [
  { label: "Find a product", message: "Can you help me find a product?", Icon: Search },
  { label: "Track my order", message: "I want to track my order", Icon: Truck },
  { label: "Delivery charges to my area", message: "How much is delivery to my area?", Icon: MapPin },
  { label: "Returns and warranty", message: "What is your return and warranty policy?", Icon: RotateCcw },
];

type WidgetMessage = ChatMessage & ReplyCards;

interface StoredChat {
  conversationId: string | null;
  messages: WidgetMessage[];
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

function teaserSeen(): boolean {
  try {
    return sessionStorage.getItem(TEASER_KEY) === "1";
  } catch {
    return true;
  }
}

function markTeaserSeen() {
  try {
    sessionStorage.setItem(TEASER_KEY, "1");
  } catch {}
}

function Cr7Badge({ size }: { size: "sm" | "md" | "lg" }) {
  const box = { sm: "h-7 w-7 text-[9px]", md: "h-11 w-11 text-sm", lg: "h-16 w-16 text-xl" }[size];
  const dot = { sm: "hidden", md: "h-[11px] w-[11px] border-2", lg: "h-3.5 w-3.5 border-[3px]" }[size];
  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-manrope)] font-extrabold tracking-tight ${box} ${
        size === "sm" ? "bg-[#111111] text-white" : "bg-white text-[#111111]"
      }`}
    >
      CR7
      <span className={`cr7-live absolute right-0 bottom-0 rounded-full border-[#111111] bg-[#22c55e] ${dot}`} />
    </span>
  );
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

function ProductCards({ products, onOpen }: { products: ProductCard[]; onOpen: () => void }) {
  return (
    <ul className="cr7-stagger overflow-hidden rounded-[14px] border border-[var(--border)] bg-white">
      {products.map((product) => (
        <li key={product.href} className="border-b border-[#f0f0f0] last:border-b-0">
          <Link
            href={product.href}
            onClick={onOpen}
            className="group flex items-center gap-3 px-3 py-2.5 text-[#111111] transition-colors hover:bg-[#f9fafb]"
          >
            <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px] bg-[#f4f4f5]">
              {product.image && (
                <Image src={product.image} alt="" fill sizes="56px" className="object-cover" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="line-clamp-2 text-[13px] leading-snug font-semibold">{product.name}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                {product.priceVaries && <span className="text-[var(--color-text-secondary)]">from</span>}
                <strong className="text-sm">{formatPrice(product.price)}</strong>
                {product.regularPrice != null && (
                  <span className="text-[var(--color-text-secondary)] line-through">
                    {formatPrice(product.regularPrice)}
                  </span>
                )}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                    product.inStock ? "bg-[#ecfdf5] text-[#047857]" : "bg-[#fef2f2] text-[#b91c1c]"
                  }`}
                >
                  {product.inStock ? "In stock" : "Out of stock"}
                </span>
              </span>
            </span>
            <ChevronRight
              className="h-[18px] w-[18px] shrink-0 text-[var(--color-text-secondary)] transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OrderStatusCard({ order }: { order: OrderCard }) {
  const progress = orderProgress(order.status);
  return (
    <div className="cr7-in flex flex-col gap-3.5 rounded-[14px] border border-[var(--border)] bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--font-manrope)] text-[15px] font-extrabold">{order.orderNumber}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            progress == null ? "bg-[#fef2f2] text-[#b91c1c]" : "bg-[#eff6ff] text-[var(--color-navy)]"
          }`}
        >
          {orderStatusLabel(order.status)}
        </span>
      </div>

      {progress != null && (
        <ol className="grid grid-cols-4 gap-1" aria-label={`Order progress: ${orderStatusLabel(order.status)}`}>
          {ORDER_STEPS.map((step, i) => (
            <li key={step} className="flex flex-col gap-1.5">
              <span className="h-1 overflow-hidden rounded-full bg-[#e5e7eb]">
                {i < progress && (
                  <span
                    className="cr7-fill block h-full rounded-full bg-[#111111]"
                    style={{ animationDelay: `${200 + i * 250}ms` }}
                  />
                )}
              </span>
              <span
                className={`text-[11px] ${
                  i < progress ? "text-[#111111]" : "text-[var(--color-text-secondary)]"
                } ${i === progress - 1 ? "font-semibold" : ""}`}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>
      )}

      <dl className="flex flex-col gap-1.5 text-[13px]">
        {order.items.slice(0, 3).map((item, i) => (
          <div key={i} className="flex justify-between gap-3">
            <dt className="text-[#4b5563]">{i === 0 ? (order.items.length > 1 ? "Items" : "Item") : ""}</dt>
            <dd className="text-right">
              {item.name} × {item.quantity}
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-3">
          <dt className="text-[#4b5563]">Payment</dt>
          <dd>{paymentMethodLabel(order.paymentMethod)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#4b5563]">Total</dt>
          <dd className="font-bold">{formatPrice(order.total)}</dd>
        </div>
      </dl>

      {order.trackingUrl && (
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center rounded-[12px] bg-[#111111] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-navy)]"
        >
          Track with courier
        </a>
      )}
    </div>
  );
}

export function SupportChat({ whatsappUrl }: { whatsappUrl: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<StoredChat>({ conversationId: null, messages: [] });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  // A one-time "Need help?" bubble per visit, a moment after the page
  // settles, gone again after a few seconds.
  useEffect(() => {
    if (teaserSeen()) return;
    const show = setTimeout(() => setTeaser(true), 2500);
    const hide = setTimeout(() => {
      setTeaser(false);
      markTeaserSeen();
    }, 11000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Follow the conversation to its latest message; the welcome topics
  // (no messages yet) stay at the top.
  useEffect(() => {
    if (chat.messages.length === 0 && !sending) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
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

  // The saved conversation is read on first open rather than on mount, so
  // the closed button costs nothing and server and client render the same.
  function openChat() {
    if (!loadedRef.current) {
      loadedRef.current = true;
      setChat(loadChat());
    }
    setTeaser(false);
    markTeaserSeen();
    setOpen(true);
  }

  async function send(text: string) {
    const content = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!content || sending) return;

    const messages: WidgetMessage[] = [...chat.messages, { role: "user", content }];
    const pending = { ...chat, messages };
    setChat(pending);
    saveChat(pending);
    setInput("");
    setSending(true);

    let reply: WidgetMessage = {
      role: "assistant",
      content: "Sorry, something went wrong. Please try again, or chat with our team on WhatsApp below.",
    };
    let conversationId = chat.conversationId;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only text goes back to the server; cards are display-only.
        body: JSON.stringify({
          conversationId,
          messages: messages.slice(-MAX_HISTORY_MESSAGES).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | ({ reply?: string; conversationId?: string } & ReplyCards)
        | null;
      if (data?.reply) reply = { role: "assistant", content: data.reply, products: data.products, order: data.order };
      if (data?.conversationId) conversationId = data.conversationId;
    } catch {}

    const next: StoredChat = { conversationId, messages: [...messages, reply] };
    setChat(next);
    saveChat(next);
    setSending(false);
  }

  const launcherBottom =
    "calc(var(--whatsapp-fab-bottom-base) + 4.25rem + env(safe-area-inset-bottom) + var(--mobile-bottom-bar-offset, 0px) + var(--pdp-floating-bar-height, 0px))";
  const isEmpty = chat.messages.length === 0;

  return (
    <>
      {!open && (
        <div
          className="fixed right-5 z-[var(--z-whatsapp)] flex flex-col items-end gap-3 print:hidden sm:right-8"
          style={{ bottom: launcherBottom }}
        >
          {teaser && (
            <div className="cr7-pop relative max-w-[220px] rounded-[16px] rounded-br-[4px] border border-[var(--border)] bg-white py-2.5 pr-8 pl-3.5 text-[13px] leading-snug text-[#111111] shadow-[0_8px_24px_rgba(17,17,17,0.10)]">
              Hi! I&apos;m CR7. Need help finding something?
              <button
                type="button"
                onClick={() => {
                  setTeaser(false);
                  markTeaserSeen();
                }}
                aria-label="Dismiss"
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[#f4f4f5]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={openChat}
            aria-label="Chat with CR7, TrendyMall's assistant"
            className="cr7-bob flex h-14 items-center gap-2.5 rounded-full bg-[#111111] py-0 pr-5 pl-1.5 text-white transition-colors hover:bg-[var(--color-navy)]"
          >
            <Cr7Badge size="md" />
            <span className="text-[15px] font-semibold">Ask CR7</span>
          </button>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Chat with CR7"
          className="cr7-pop fixed inset-x-0 bottom-0 z-[var(--z-drawer-panel)] flex h-[85dvh] flex-col overflow-hidden rounded-t-[20px] border border-[var(--border)] bg-white font-[family-name:var(--font-inter)] text-[#111111] shadow-[0_16px_48px_rgba(0,0,0,0.18)] print:hidden sm:inset-x-auto sm:right-8 sm:bottom-8 sm:h-[min(640px,calc(100dvh-4rem))] sm:w-[390px] sm:rounded-[20px]"
        >
          {isEmpty ? (
            <div className="flex flex-col gap-3.5 bg-[#111111] px-5 pt-4 pb-6 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#d1d5db]">TrendyMall support</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                >
                  <X className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </div>
              <span className="cr7-pop" style={{ transformOrigin: "left center" }}>
                <Cr7Badge size="lg" />
              </span>
              <h2 className="cr7-in font-[family-name:var(--font-manrope)] text-[26px] leading-tight font-extrabold" style={{ animationDelay: "120ms" }}>
                Hi, I&apos;m CR7
              </h2>
              <p className="cr7-in text-sm leading-relaxed text-[#e5e7eb]" style={{ animationDelay: "220ms" }}>
                Your TrendyMall shopping assistant. I can find products, check delivery charges and track your order.
              </p>
              <div className="cr7-in flex flex-wrap gap-1.5" style={{ animationDelay: "320ms" }}>
                {["English", "සිංහල", "தமிழ்"].map((lang) => (
                  <span key={lang} className="rounded-full bg-white/15 px-2.5 py-1 text-xs">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-[#111111] px-4 py-3.5 text-white">
              <Cr7Badge size="md" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-[family-name:var(--font-manrope)] text-base font-extrabold">CR7</span>
                <span className="text-xs text-[#d1d5db]">TrendyMall assistant · replies in seconds</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>
          )}

          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#f4f4f5] p-4" aria-live="polite">
            {isEmpty && !sending && (
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold tracking-wider text-[#4b5563] uppercase">Ask me about</span>
                <div className="cr7-stagger flex flex-col gap-2.5">
                  {TOPICS.map(({ label, message, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => send(message)}
                      className="flex min-h-14 items-center gap-3 rounded-[14px] border border-[var(--border)] bg-white px-3.5 text-left text-sm transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#111111] hover:shadow-[0_6px_16px_rgba(17,17,17,0.08)] motion-reduce:hover:translate-y-0"
                    >
                      <Icon className="h-5 w-5 text-[var(--color-navy)]" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.messages.map((message, i) =>
              message.role === "user" ? (
                <div
                  key={i}
                  className="cr7-in max-w-[80%] self-end rounded-[18px] rounded-br-[4px] bg-[#111111] px-3.5 py-2.5 text-sm whitespace-pre-line text-white"
                >
                  {message.content}
                </div>
              ) : (
                <div key={i} className="cr7-in flex items-end gap-2">
                  <Cr7Badge size="sm" />
                  <div className="flex max-w-[86%] min-w-0 flex-1 flex-col gap-2.5">
                    <p className="rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-3 text-sm leading-relaxed whitespace-pre-line">
                      <ReplyText text={message.content} />
                    </p>
                    {message.products && message.products.length > 0 && (
                      <ProductCards products={message.products} onOpen={() => setOpen(false)} />
                    )}
                    {message.order && <OrderStatusCard order={message.order} />}
                  </div>
                </div>
              ),
            )}

            {sending && (
              <div className="cr7-in flex items-center gap-2">
                <Cr7Badge size="sm" />
                <div
                  className="flex items-center gap-1 rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-3.5"
                  role="status"
                  aria-label="CR7 is typing"
                >
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="cr7-dot h-1.5 w-1.5 rounded-full bg-[var(--color-text-secondary)]"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            className="flex flex-col gap-2 border-t border-[var(--border)] bg-white px-3.5 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-center gap-2">
              <label htmlFor="cr7-message" className="sr-only">
                Your message
              </label>
              <input
                id="cr7-message"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={MAX_MESSAGE_LENGTH}
                autoComplete="off"
                placeholder="Ask CR7 anything…"
                className="h-11 min-w-0 flex-1 rounded-full border border-[#d1d5db] bg-[#f9fafb] px-4 text-base outline-none focus:border-[#111111] focus:bg-white sm:text-sm"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white transition-colors hover:bg-[var(--color-navy)] disabled:opacity-40"
              >
                <Send className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>
            <p className="text-center text-[11px] text-[var(--color-text-secondary)]">
              Need a person?{" "}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#111111] underline">
                Chat with our team on WhatsApp
              </a>
            </p>
          </form>
        </div>
      )}
    </>
  );
}
