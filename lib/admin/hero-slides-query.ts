"use server";

import { requireAdminClient } from "@/lib/admin/guard";

export interface AdminHeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  desktop_image_url: string;
  mobile_image_url: string;
  status: string;
  sort_order: number;
  start_at: string | null;
  end_at: string | null;
}

export async function getAdminHeroSlides(): Promise<AdminHeroSlide[]> {
  const supabase = await requireAdminClient();
  const { data, error } = await supabase.from("hero_slides").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getHeroSlideForEdit(id: string): Promise<AdminHeroSlide | null> {
  const supabase = await requireAdminClient();
  const { data, error } = await supabase.from("hero_slides").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
