// Pure, import-free -- same "safe for both a server action and a client
// component" shape as campaign-status.ts/campaign-datetime.ts. A campaign
// can only ever reduce a variant's price, never merely match or exceed it;
// this is the one place that rule is checked, shared by CampaignItemsTable's
// client-side warning and saveCampaign's authoritative server-side check
// (previously two separate, hand-duplicated copies of the same comparison).
export function campaignPriceUndercuts(
  campaignPrice: number,
  regularPrice: number,
  salePrice: number | null,
): boolean {
  const currentPrice = salePrice ?? regularPrice;
  return campaignPrice < currentPrice;
}
