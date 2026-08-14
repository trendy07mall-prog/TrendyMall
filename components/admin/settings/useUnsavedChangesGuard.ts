"use client";

import { useEffect } from "react";

// No existing unsaved-changes pattern was found anywhere in the admin
// codebase (confirmed via a repo-wide grep before writing this) — this is
// the first one, shared by every Settings form (Phase 1 and every later
// phase). Two layers: `beforeunload` catches a real tab close/refresh;
// the capturing document click listener catches in-app navigation (e.g.
// clicking another Settings section link) by intercepting the click on
// any internal <a> before Next's <Link> handler runs, confirming with the
// user, and only letting the click through if they accept. It does not
// catch a router.push() triggered from outside a click (e.g. a keyboard
// shortcut) — a real but narrow gap, acceptable for a first version of
// this guard.
export function useUnsavedChangesGuard(isDirty: boolean, message = "You have unsaved changes. Leave this page?") {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function handleClickCapture(event: MouseEvent) {
      const anchor = (event.target as HTMLElement)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClickCapture, true);
    };
  }, [isDirty, message]);
}
