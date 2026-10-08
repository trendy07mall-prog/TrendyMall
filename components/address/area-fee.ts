/**
 * The fee shown beside an area in the picker.
 *
 * This does NOT compute a fee. It turns an area into the selection value
 * the existing resolver understands, then asks lib/delivery-fee.ts for the
 * number -- the same call the checkout preview and create_order_atomic's
 * PL/pgSQL mirror both agree with. A second rule here, however small, is
 * exactly how a quoted price and a charged price drift apart.
 */

import { calculateDeliveryFee, resolveZoneSelection, type DeliveryZone } from "@/lib/delivery-fee";
import { areaSelectionValue, type Area } from "@/lib/sri-lanka/areas";

export function feeForArea(area: Area, zones: DeliveryZone[]): number {
  const { zoneKey, postalCode } = resolveZoneSelection(areaSelectionValue(area));
  return calculateDeliveryFee(
    { district: area.district, postalCode, zoneKey, deliveryMethod: "standard" },
    zones,
  );
}

export function formatFee(fee: number): string {
  return `Rs ${fee.toLocaleString("en-LK")}`;
}
