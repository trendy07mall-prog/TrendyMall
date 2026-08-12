"use server";

import { headers } from "next/headers";
import { sendContactFormEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidSriLankanPhone } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactFormResult {
  success: boolean;
  error?: string;
}

// Server Action, not an app/api route -- matches every other transactional
// email in this codebase (sendOrderConfirmationEmails etc., lib/email.ts),
// all of which are called directly from components rather than via a
// fetch()'d route handler.
export async function submitContactForm(formData: FormData): Promise<ContactFormResult> {
  // Honeypot: a real visitor never sees or fills this field (it's visually
  // hidden and unreachable by keyboard tab order in ContactForm.tsx) -- a
  // bot filling it gets a fake success so detection is never revealed.
  const honeypot = String(formData.get("company") ?? "").trim();
  if (honeypot) return { success: true };

  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !contact || !message) {
    return { success: false, error: "Please fill in all required fields." };
  }
  if (!EMAIL_RE.test(contact) && !isValidSriLankanPhone(contact)) {
    return { success: false, error: "Enter a valid email address or Sri Lankan phone number." };
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

  const allowed = checkRateLimit(`contact-form:${ip}`, { max: 3, windowMs: 10 * 60 * 1000 });
  if (!allowed) {
    return { success: false, error: "Too many messages sent. Please try again in a few minutes." };
  }

  const result = await sendContactFormEmail({
    name,
    contact,
    orderNumber: orderNumber || null,
    message,
  });

  if (!result.success) {
    return { success: false, error: "Something went wrong sending your message. Please try again." };
  }
  return { success: true };
}
