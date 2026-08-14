import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCampaignEndingDigest } from "@/lib/email";
import { getNotificationSettings } from "@/lib/data/settings";

const ENDING_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

// Vercel Cron calls this on the schedule in vercel.json (GET, no
// cookies/session -- same "no user session exists here" situation as the
// PayHere webhook, so this uses the service-role client too). Trust comes
// from CRON_SECRET, not auth -- same defensive posture as the webhook's
// own signature check, just a shared-secret instead of an HMAC since
// Vercel Cron (unlike PayHere) supports sending a fixed bearer token.
// Runs once daily; a campaign is only ever notified once per "ending
// soon" window (ending_soon_notified_at), reset by
// lib/admin/campaigns.ts's saveCampaign whenever an admin pushes end_at
// back out beyond the window, so an extended campaign can notify again.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await getNotificationSettings();
  if (!notifications.campaignEndingEnabled) {
    return NextResponse.json({ skipped: "campaign_ending_enabled is off" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + ENDING_SOON_WINDOW_MS);

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name, end_at")
    .eq("status", "published")
    .eq("is_archived", false)
    .not("end_at", "is", null)
    .gt("end_at", now.toISOString())
    .lte("end_at", windowEnd.toISOString())
    .is("ending_soon_notified_at", null);

  if (error) {
    console.error("campaign-ending cron: query failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  await sendCampaignEndingDigest(
    campaigns.map((c) => ({ name: c.name, endAt: c.end_at as string })),
  );

  await supabase
    .from("campaigns")
    .update({ ending_soon_notified_at: now.toISOString() })
    .in(
      "id",
      campaigns.map((c) => c.id),
    );

  return NextResponse.json({ notified: campaigns.length });
}
