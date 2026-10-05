"use client";

import { useState, useTransition } from "react";
import { BanIcon, CheckIcon } from "@/components/ui/Icon";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteReview, updateReviewStatus } from "@/lib/admin/reviews";

// Approve / Hide / Delete for one review.
//
// "Hide from shop", not "Reject": an admin is deciding whether a review
// appears on the site, not passing judgement on the customer who wrote
// it. The stored value is still `rejected` -- renaming the label is a
// wording change, not a data migration, so nothing else has to move.
//
// Delete is deliberately quieter than the other two: a plain text button
// rather than a filled red one, because it is the only irreversible
// action here and it should not be the easiest thing to hit. It asks
// first, through the app's own dialog rather than window.confirm, which
// some browsers and embedded webviews suppress outright.
export function ReviewActions({
  reviewId,
  status,
  hasReply,
}: {
  reviewId: string;
  status: string;
  // Changes the delete warning: losing a reply as well as a review is
  // worth saying out loud before it happens.
  hasReply?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {status !== "approved" && (
        <form action={updateReviewStatus.bind(null, reviewId, "approved")}>
          <ActionButton type="submit" icon={CheckIcon} label="Approve" tone="success" size="sm" />
        </form>
      )}
      {status !== "rejected" && (
        <form action={updateReviewStatus.bind(null, reviewId, "rejected")}>
          <ActionButton type="submit" icon={BanIcon} label="Hide from shop" tone="warning" size="sm" />
        </form>
      )}

      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-[var(--radius-btn)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:text-red-600 hover:underline"
      >
        Delete
      </button>

      {confirming && (
        <ConfirmDialog
          title="Delete this review?"
          message={
            hasReply
              ? "The review and your reply are both deleted permanently. This cannot be undone. To take it off the shop without deleting it, use Hide from shop instead."
              : "This review is deleted permanently and cannot be undone. To take it off the shop without deleting it, use Hide from shop instead."
          }
          confirmLabel="Delete review"
          destructive
          pending={pending}
          onConfirm={() =>
            startTransition(async () => {
              await deleteReview(reviewId);
              setConfirming(false);
            })
          }
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
