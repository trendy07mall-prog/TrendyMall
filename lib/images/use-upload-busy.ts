"use client";

import { useCallback, useState } from "react";

/**
 * Tracks whether ANY image field in a form is still working, so Save can
 * stay disabled until every one of them is finished.
 *
 * Counted rather than a boolean because a form can have several pickers
 * (a campaign has four) and a multi-select can be running beside a single
 * one. A plain flag would be cleared by whichever finished first, which is
 * exactly the half-processed save this is here to prevent.
 *
 * CategoryForm and BrandForm already did this with their own `uploading`
 * state; ProductForm, CampaignForm and HeroSlideForm did not, and could be
 * saved mid-upload.
 */
export function useUploadBusy() {
  const [count, setCount] = useState(0);

  const onBusyChange = useCallback((busy: boolean) => {
    setCount((current) => (busy ? current + 1 : Math.max(0, current - 1)));
  }, []);

  return { uploadBusy: count > 0, onBusyChange };
}
