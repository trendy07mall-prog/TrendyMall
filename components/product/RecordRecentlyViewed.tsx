"use client";

import { useEffect } from "react";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";

export function RecordRecentlyViewed({
  productId,
  slug,
  name,
  image,
  price,
}: {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
}) {
  const { recordView } = useRecentlyViewed();

  useEffect(() => {
    recordView({ productId, slug, name, image, price });
  }, [productId, slug, name, image, price, recordView]);

  return null;
}
