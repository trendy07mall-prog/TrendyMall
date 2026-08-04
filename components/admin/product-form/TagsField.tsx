"use client";

import type { Tag } from "@/types";

export function TagsField({
  tags,
  defaultTagIds,
}: {
  tags: Tag[];
  defaultTagIds: string[];
}) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Tags</span>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {tags.map((tag) => (
          <label key={tag.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="tagIds"
              value={tag.id}
              defaultChecked={defaultTagIds.includes(tag.id)}
            />
            {tag.name}
          </label>
        ))}
      </div>
    </div>
  );
}
