# Sri Lanka area data

`areas.data.ts` is **generated**. Do not edit it by hand.

## Source

[SKIDDOW/SriLankaCitiesDatabase](https://github.com/SKIDDOW/SriLankaCitiesDatabase) (MIT),
files `provinces.json`, `districts.json`, `cities.json`.

Validated at import rather than trusted:

| | |
|---|---|
| Provinces | 9 |
| Districts | 25 — names match the `district` CHECK constraint on `shipping_addresses` (sql/020) and `customer_addresses` (sql/030) **exactly, both ways** |
| Areas | 2,170 upstream + 1 local addition = 2,171 |
| Payload | ~18 KB gzipped, loaded on checkout only |

## Local additions

**Wellampitiya** is missing upstream and is added by hand in `areas.ts`
(`LOCAL_ADDITIONS`), using the postal code this codebase already held
(`WELLAMPITIYA_POSTAL_CODE` = 10600, Colombo district). It is the shop's own
town and has its own delivery rate.

Anything else added must be a real place with a postal code from a named
source. Never guess one.

## Known gaps

- 101 upstream rows carry the literal string `"NULL"` as their postcode (all
  in Jaffna and Kilinochchi). Stored as `null`, never as the word. They fall
  outside every delivery zone and price at the default rate, which is correct.
- Upstream names Colombo zones `Colombo 8`; the UI shows `Colombo 08`.

## Regenerating

Download the three JSON files from the repo above and run a script that
emits `[name, districtIndex, postalCode, subName]` rows sorted by name,
dropping latitude, longitude and the Sinhala/Tamil names.

**After regenerating, run `npm test`.** `fee-parity.test.ts` asserts the row
count and that every district still passes the CHECK constraint, so a
silently truncated or renamed dataset fails there rather than at order time.
