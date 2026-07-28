"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 6;

// Smooths over the "PayHere's browser redirect can arrive before its
// server-to-server notify_url callback has finished processing" race —
// the page always renders the real, current DB state (never trusts the
// redirect itself), this just re-fetches it a few times so the customer
// doesn't have to manually reload once the webhook lands.
export function PendingPaymentPoller() {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > MAX_ATTEMPTS) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
