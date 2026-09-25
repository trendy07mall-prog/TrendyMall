"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { linkGuestOrders } from "@/lib/account/link-guest-orders";

// Runs once when the account area mounts, which is the first moment a real
// session is known to exist. Deliberately here rather than in signup: an
// account is created before its e-mail is confirmed, and linking at that
// point would let anyone absorb a stranger's order history by typing their
// address (see sql/084).
//
// The account layout is what mounts this, so it fires on a load of any
// /account/* page and not again while navigating between them -- the
// layout does not remount for sub-route changes.
//
// Placed in the layout rather than on /account/orders alone so it also
// covers someone who lands on the address book or the overview first.
export function GuestOrderLinker() {
  const startedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // React 18+ mounts effects twice in development; without this the
    // server action would fire twice on every load. Harmless (the second
    // call links nothing) but pointless.
    if (startedRef.current) return;
    startedRef.current = true;

    linkGuestOrders()
      .then(({ linked }) => {
        // Only refresh when something actually changed. The page has
        // already rendered by now -- with an empty orders list, which is
        // exactly the symptom -- so it needs re-rendering against the
        // rows that now belong to this account.
        if (linked > 0) router.refresh();
      })
      .catch(() => {
        // Background best-effort. A failure here leaves the account
        // exactly as it was, which is the pre-fix behaviour, not a
        // regression.
      });
  }, [router]);

  return null;
}
