/**
 * Sri Lanka's provinces, districts and areas, shaped for the address picker.
 *
 * WHAT THIS IS NOT: it is not a pricing module. Nothing here decides a
 * delivery fee. An area is turned into the same "selection" string the old
 * Colombo dropdown produced, and lib/delivery-fee.ts's own
 * resolveZoneSelection() turns that into { zoneKey, postalCode } exactly as
 * it always has. Keeping that one bridge is deliberate: the fee preview and
 * create_order_atomic's PL/pgSQL mirror (sql/068, sql/082) must agree, and
 * the way they agree is by both starting from the same resolver rather than
 * each deriving a code of their own.
 *
 * THE WELLAMPITIYA TRAP, which is the reason this file is careful. Its real
 * postal code is 10600 -- served by the Kolonnawa post office, nowhere near
 * Colombo 1-15's 00100-01500 -- but it is priced at the Colombo rate via an
 * explicit zone KEY, never by its postal code. A picker that filled in the
 * postal code and dropped the key would silently re-price it from Rs 255 to
 * Rs 400, and nothing on screen would look wrong. areaSelectionValue()
 * below is what prevents that, and fee-parity.test.ts is what proves it.
 */

import {
  WELLAMPITIYA_POSTAL_CODE,
  WELLAMPITIYA_ZONE_KEY,
} from "@/lib/delivery-fee";
import { AREAS, DISTRICTS, PROVINCES, type AreaRow } from "./areas.data";

export interface Area {
  /** Stable key for React lists and for round-tripping a selection. */
  readonly id: string;
  /** What goes in the `city` column. */
  readonly name: string;
  /** How it reads in the UI, e.g. "Colombo 08 - Borella". */
  readonly displayName: string;
  /** What goes in the `district` column -- always one of the 25. */
  readonly district: string;
  /** How the district reads in the UI; see districtLabel. */
  readonly districtLabel: string;
  /** What goes in the new, nullable `province` column. */
  readonly province: string;
  readonly postalCode: string | null;
  /** Lowercased haystack for search, including the sub-name. */
  readonly search: string;
  /** True for entries this project added by hand, not from the dataset. */
  readonly isLocalAddition: boolean;
}

/**
 * Wellampitiya is missing from the upstream dataset, and it is the one town
 * this shop cannot be missing: it is where the shop is, and it has its own
 * delivery rate. Added by hand from values this codebase already holds
 * (lib/delivery-fee.ts's WELLAMPITIYA_POSTAL_CODE), not invented here.
 *
 * Anything else added to this list must be a real place with a real postal
 * code from a named source -- never a guess.
 */
const LOCAL_ADDITIONS: AreaRow[] = [
  ["Wellampitiya", DISTRICTS.findIndex((d) => d.name === "Colombo"), WELLAMPITIYA_POSTAL_CODE, null],
];

/** Colombo 1-15's real postal range -- the same one lib/delivery-fee.ts uses. */
const COLOMBO_RANGE_START = "00100";
const COLOMBO_RANGE_END = "01500";

function inColomboRange(postalCode: string | null): boolean {
  return postalCode !== null && postalCode >= COLOMBO_RANGE_START && postalCode <= COLOMBO_RANGE_END;
}

/**
 * "Colombo 8" in the data, "Colombo 08" on screen -- the zero-padded form is
 * what the rest of this app has always shown (COLOMBO_ZONE_POSTAL_CODES
 * builds the same label) and what the approved design asks for.
 */
function displayNameFor(name: string, subName: string | null): string {
  const colombo = /^Colombo (\d{1,2})$/.exec(name);
  const base = colombo ? `Colombo ${colombo[1].padStart(2, "0")}` : name;
  return subName ? `${base} - ${subName}` : base;
}

/**
 * Colombo district is shown as two groups, because as one list it misleads.
 * "Colombo" covers both the 1-15 postal zones on the cheaper rate AND towns
 * like Kaduwela and Homagama that are in the district but not on that rate.
 * Splitting them is a LABEL only -- both still store district "Colombo",
 * which is what the CHECK constraint requires.
 */
function districtLabelFor(district: string, postalCode: string | null): string {
  if (district !== "Colombo") return district;
  return inColomboRange(postalCode) ? "Colombo (1-15)" : "Colombo - Greater";
}

function buildArea(row: AreaRow, index: number, isLocal: boolean): Area {
  const [name, districtIndex, postalCode, subName] = row;
  const districtEntry = DISTRICTS[districtIndex];
  const district = districtEntry.name;
  const province = PROVINCES[districtEntry.province];
  const displayName = displayNameFor(name, subName);
  return {
    id: `${isLocal ? "L" : "A"}${index}`,
    name,
    displayName,
    district,
    districtLabel: districtLabelFor(district, postalCode),
    province,
    postalCode,
    // Sub-name included so typing "borella" finds "Colombo 08 - Borella",
    // which is the single most useful thing this picker does.
    search: `${displayName} ${name} ${subName ?? ""} ${district} ${province}`.toLowerCase(),
    isLocalAddition: isLocal,
  };
}

export const ALL_AREAS: readonly Area[] = [
  ...AREAS.map((row, i) => buildArea(row, i, false)),
  ...LOCAL_ADDITIONS.map((row, i) => buildArea(row, i, true)),
];

export const ALL_PROVINCES: readonly string[] = PROVINCES;

/** District display labels under one province, in the order shown. */
export function districtLabelsForProvince(province: string): string[] {
  const labels = new Set<string>();
  for (const area of ALL_AREAS) {
    if (area.province === province) labels.add(area.districtLabel);
  }
  return [...labels].sort((a, b) => a.localeCompare(b, "en"));
}

/** Areas under one district label, in the order shown. */
export function areasForDistrictLabel(province: string, districtLabel: string): Area[] {
  return ALL_AREAS.filter((a) => a.province === province && a.districtLabel === districtLabel).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en"),
  );
}

export function areaById(id: string): Area | undefined {
  return ALL_AREAS.find((a) => a.id === id);
}

/**
 * THE BRIDGE TO PRICING. Produces the same kind of value the old Colombo
 * <select> produced, so lib/delivery-fee.ts's resolveZoneSelection() can
 * turn it into { zoneKey, postalCode } with no new rule anywhere.
 *
 *  - Wellampitiya  -> its zone KEY, so it prices on the key and not on
 *                     10600, which would otherwise read as "outside Colombo".
 *  - anything else -> its postal code, or "" when it has none (the 101
 *                     northern areas), which resolves to no code and the
 *                     default rate.
 */
export function areaSelectionValue(area: Area): string {
  if (area.name === "Wellampitiya") return WELLAMPITIYA_ZONE_KEY;
  return area.postalCode ?? "";
}

/** Everything an address form needs from one picked area. */
export function areaToAddressFields(area: Area): {
  city: string;
  district: string;
  province: string;
  postalCode: string | null;
  selectionValue: string;
} {
  return {
    // The plain name is stored, not the decorated display name: `city` is
    // read by the courier label, the invoice and the admin order page.
    city: area.name,
    district: area.district,
    province: area.province,
    postalCode: area.postalCode,
    selectionValue: areaSelectionValue(area),
  };
}
