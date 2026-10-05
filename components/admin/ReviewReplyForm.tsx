"use client";

import { useState, useTransition } from "react";
import { QUICK_REPLIES, REPLY_MAX_LENGTH } from "@/lib/review-reply";
import { removeReviewReply, replyToReview } from "@/lib/admin/reviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// The reply box, and the posted reply with its Edit / Remove controls.
//
// Only rendered for reviews that can actually be replied to -- approved
// and not staff-written. The server action checks both again before
// writing (lib/admin/reviews.ts); this component decides what to SHOW,
// not what is allowed.
export function ReviewReplyForm({
  reviewId,
  existingReply,
  repliedAt,
  canReply,
}: {
  reviewId: string;
  existingReply: string | null;
  repliedAt: string | null;
  // False for pending, hidden and staff reviews. An existing reply is
  // still shown when false, with Remove only -- so a reply left behind by
  // a review that was later hidden can be cleared rather than stranded.
  canReply: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(existingReply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  const remaining = REPLY_MAX_LENGTH - text.length;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await replyToReview(reviewId, text);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeReviewReply(reviewId);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setConfirmingRemove(false);
      setText("");
      setOpen(false);
    });
  }

  // --- a reply exists, and we are not editing it ---------------------
  if (existingReply && !open) {
    return (
      <div className="mt-3">
        <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--color-warning)] bg-[var(--color-warning)]/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-[#0F2D52]">
            Your reply
            {repliedAt && (
              <span className="ml-1.5 font-normal text-[var(--color-text-secondary)]">
                · {new Date(repliedAt).toLocaleDateString()}
              </span>
            )}
            {!canReply && (
              // Says plainly why a reply that exists is not on the site,
              // rather than leaving an admin to wonder.
              <span className="ml-1.5 font-normal text-[var(--color-text-secondary)]">
                · not visible, this review is not shown in the shop
              </span>
            )}
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-[var(--color-text-secondary)]">
            {existingReply}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {canReply && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-[var(--radius-btn)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-black/5"
            >
              Edit reply
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            className="rounded-[var(--radius-btn)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-black/5"
          >
            Remove reply
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {confirmingRemove && (
          <ConfirmDialog
            title="Remove this reply?"
            message="The reply will disappear from the product page. The customer's review itself is not affected."
            confirmLabel="Remove reply"
            destructive
            pending={pending}
            onConfirm={remove}
            onClose={() => setConfirmingRemove(false)}
          />
        )}
      </div>
    );
  }

  // Nothing to show: no reply, and replying is not allowed here.
  if (!canReply && !existingReply) return null;

  // --- the closed "Reply" button --------------------------------------
  if (!open) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-[var(--radius-btn)] bg-[#111111] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black/80"
        >
          Reply
        </button>
      </div>
    );
  }

  // --- the open reply box ---------------------------------------------
  return (
    <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_REPLIES.map((quick) => (
          <button
            key={quick.label}
            type="button"
            // Inserts a starting point an admin then edits -- it does not
            // post. Replacing the box only when it is empty avoids wiping
            // something half-written by a misclick.
            onClick={() => setText((current) => (current.trim() ? current : quick.text))}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium hover:bg-black/5"
          >
            {quick.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value.slice(0, REPLY_MAX_LENGTH))}
        maxLength={REPLY_MAX_LENGTH}
        rows={4}
        placeholder="Write a reply the customer will see under their review…"
        className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border)] p-2.5 text-sm focus:border-[#0F2D52] focus:outline-none"
      />

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p
          className={`text-xs ${
            remaining <= 50 ? "text-[var(--color-warning)]" : "text-[var(--color-text-secondary)]"
          }`}
        >
          {remaining} characters left · plain text only, links are removed
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setText(existingReply ?? "");
              setError(null);
            }}
            className="rounded-[var(--radius-btn)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !text.trim()}
            className="rounded-[var(--radius-btn)] bg-[#111111] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black/80 disabled:opacity-50"
          >
            {pending ? "Saving…" : existingReply ? "Save reply" : "Post reply"}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
