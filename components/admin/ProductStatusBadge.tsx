import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ProductStatus } from "@/types";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const isPublished = status === "published";
  return <StatusBadge tone={isPublished ? "success" : "neutral"}>{isPublished ? "Published" : "Draft"}</StatusBadge>;
}
