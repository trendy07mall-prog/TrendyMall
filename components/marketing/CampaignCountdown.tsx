"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function splitRemaining(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// label: "Starts in" while the campaign is scheduled (counting to
// start_at), "Ends in" while active (counting to end_at) -- the page
// decides which target/label to pass, this component only ticks and
// re-syncs. When the countdown hits zero it does NOT just freeze at
// 00:00:00 -- the campaign's real runtime status (published-window,
// pricing) may have just changed server-side, so it calls router.refresh()
// once to re-fetch and re-derive the true state instead of the client
// silently trusting a stale timer.
export function CampaignCountdown({ target, label }: { target: string; label: string }) {
  const targetMs = new Date(target).getTime();
  // Starts at null (rendered identically on server and at first client
  // paint -- both render nothing) rather than computing Date.now() at SSR
  // time, which would near-guarantee a hydration mismatch the instant the
  // client's own Date.now() (a moment later) produces a different second.
  // The real value is only ever computed client-side, inside the effect
  // below, after mount.
  const [remaining, setRemaining] = useState<number | null>(null);
  const router = useRouter();
  const refreshedRef = useRef(false);

  useEffect(() => {
    function tick() {
      const next = targetMs - Date.now();
      setRemaining(next);
      if (next <= 0 && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetMs, router]);

  if (remaining == null || remaining <= 0) return null;

  const { days, hours, minutes, seconds } = splitRemaining(remaining);

  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-mono tabular-nums">
        {days > 0 && `${days}d `}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}
