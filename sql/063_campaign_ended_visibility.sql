-- Phase 4 (campaign landing page) needs an ended-but-published campaign to
-- still be readable by a public/anonymous session -- the spec requires old
-- marketing links to keep resolving with a "this campaign has ended"
-- message, not a 404. The original Phase 1 policy's `end_at > now()` check
-- (written before Phase 4 existed) blocked exactly this case: RLS was
-- silently returning zero rows for an ended campaign, so the landing page
-- couldn't distinguish "ended" from "never existed."
--
-- Campaign PRICING is unaffected by this change: getActiveCampaignPricesForVariants
-- (lib/data/campaigns.ts) has its own independent, correct start_at/end_at
-- gate and was never relying on RLS for that -- this migration only widens
-- which CAMPAIGN ROWS (name/description/banner) are readable, never which
-- prices apply. is_archived stays deliberately un-gated by RLS here too,
-- same as before -- an archived campaign is still hidden, just by the
-- landing page's own application-layer check (lib/data/campaigns.ts's
-- getCampaignPageData), not by RLS.

drop policy "campaigns_select_public_or_admin" on public.campaigns;
create policy "campaigns_select_public_or_admin" on public.campaigns
  for select using (
    public.is_admin()
    or status = 'published'
  );

drop policy "campaign_sections_select_public_or_admin" on public.campaign_sections;
create policy "campaign_sections_select_public_or_admin" on public.campaign_sections
  for select using (
    public.is_admin()
    or (is_active and exists (
      select 1 from public.campaigns c
      where c.id = campaign_sections.campaign_id
        and c.status = 'published'
    ))
  );

drop policy "campaign_items_select_public_or_admin" on public.campaign_items;
create policy "campaign_items_select_public_or_admin" on public.campaign_items
  for select using (
    public.is_admin()
    or (is_active and exists (
      select 1 from public.campaigns c
      where c.id = campaign_items.campaign_id
        and c.status = 'published'
    ))
  );
