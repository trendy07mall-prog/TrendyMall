"use client";

import { motion } from "framer-motion";
import { WhatsAppIcon } from "@/components/ui/Icon";

const WHATSAPP_URL = "https://wa.me/94775312484";

export function WhatsAppButton() {
  return (
    <div className="group fixed right-5 bottom-5 z-40 sm:right-8 sm:bottom-8">
      <span
        role="tooltip"
        className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 rounded-lg bg-[#111111] px-3 py-2 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
      >
        Need help? Chat with us on WhatsApp.
      </span>
      <motion.a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-[#25D366]"
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
        />
        <WhatsAppIcon className="relative h-7 w-7" />
      </motion.a>
    </div>
  );
}
