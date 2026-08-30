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
export function CampaignCountdown({
  target,
  label,
  size = "md",
}: {
  target: string;
  label: string;
  // "md" (default, unchanged) is every existing caller's size -- CampaignInfoBlock's
  // compact/full modes and the campaign landing page's own hero countdown. "sm" is
  // additive, for contexts with less room to spare (ProductCard's one-line Slot A)
  // than a compact CampaignInfoBlock already assumed it'd have.
  size?: "md" | "sm";
}) {
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
    <div
      className={`flex shrink-0 items-center font-medium ${
        // Must stay on one line and never wrap the label away from its own
        // value. Sized up again from the previous round (9px/11px) after
        // feedback that was still too small -- 13px (sm+, tablet/desktop
        // cards) sits closer to this card's own title/price scale (14px/
        // 13px), 11px below the sm breakpoint (a 2-column card's width).
        size === "sm" ? "flex-nowrap gap-x-1 whitespace-nowrap text-[11px] sm:text-[13px]" : "gap-2 text-sm"
      }`}
    >
      {/* Below 375px specifically, "Ends in " + the full HH:MM:SS still
          doesn't fit even at 11px -- shrinking the font further to force a
          fit was tried and rejected (it clipped the seconds off entirely,
          which reads as a frozen/broken timer, worse than a smaller but
          complete one). Dropping the label there instead keeps every
          digit visible and the size readable; 375px and up show the full
          "Ends in" wording as before. Only this "sm" size ever hides it --
          CampaignInfoBlock's/the campaign landing page's own "md" usage is
          unaffected. */}
      {size === "sm" ? (
        <span className="hidden text-[var(--muted)] min-[375px]:inline">{label}</span>
      ) : (
        <span className="text-[var(--muted)]">{label}</span>
      )}
      <span className="font-mono tabular-nums">
        {days > 0 && `${days}d `}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}
