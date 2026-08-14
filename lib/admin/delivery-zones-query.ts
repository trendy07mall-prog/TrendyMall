"use server";

import { requireAdminClient } from "@/lib/admin/guard";

export interface AdminDeliveryZone {
  id: string;
  name: string;
  postal_code_start: string | null;
  postal_code_end: string | null;
  district_match: string | null;
  rate: number;
  is_default: boolean;
  status: string;
  sort_order: number;
}

export async function getAdminDeliveryZones(): Promise<AdminDeliveryZone[]> {
  const supabase = await requireAdminClient();
  const { data, error } = await supabase.from("delivery_zones").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}
