"use client";

import { BanIcon, CheckIcon, TrashIcon } from "@/components/ui/Icon";
import { ActionButton } from "@/components/ui/ActionButton";
import { deleteReview, updateReviewStatus } from "@/lib/admin/reviews";

// Split out from app/admin/reviews/page.tsx (a Server Component) because
// ActionButton's `icon` prop is a component reference -- functions can't
// cross the Server->Client boundary as props, so the icons have to be
// resolved here, inside the Client Component, not passed in from the
// server-rendered page.
export function ReviewActions({ reviewId, status }: { reviewId: string; status: string }) {
  return (
    <div className="mt-3 flex gap-2">
      {status !== "approved" && (
        <form action={updateReviewStatus.bind(null, reviewId, "approved")}>
          <ActionButton type="submit" icon={CheckIcon} label="Approve" tone="success" size="sm" />
        </form>
      )}
      {status !== "rejected" && (
        <form action={updateReviewStatus.bind(null, reviewId, "rejected")}>
          <ActionButton type="submit" icon={BanIcon} label="Reject" tone="warning" size="sm" />
        </form>
      )}
      <form action={deleteReview.bind(null, reviewId)}>
        <ActionButton type="submit" icon={TrashIcon} label="Delete" tone="danger" size="sm" />
      </form>
    </div>
  );
}
