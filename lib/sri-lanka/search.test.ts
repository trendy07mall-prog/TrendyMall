import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ALL_AREAS, ALL_PROVINCES, areasForDistrictLabel, districtLabelsForProvince } from "./areas";
import { normalizeQuery, searchAreas } from "./search";

describe("normalizeQuery", () => {
  test("collapses case, punctuation and spacing", () => {
    assert.equal(normalizeQuery("  Colombo-08  "), "colombo 08");
    assert.equal(normalizeQuery("COLOMBO   7"), "colombo 7");
    assert.equal(normalizeQuery("Nuwara  Eliya"), "nuwara eliya");
  });
});

describe("searchAreas finds what a customer would actually type", () => {
  test("a sub-name finds its numbered zone -- the whole point", () => {
    const hits = searchAreas("borella");
    assert.ok(
      hits.some((a) => a.displayName === "Colombo 08 - Borella"),
      `got: ${hits.map((a) => a.displayName).join(", ")}`,
    );
  });

  test("typing a city name finds it", () => {
    for (const q of ["kandy", "galle", "negombo", "jaffna", "nugegoda"]) {
      const hits = searchAreas(q);
      assert.ok(hits.length > 0, `no results for "${q}"`);
      assert.ok(
        hits.some((a) => a.search.includes(q)),
        `"${q}" returned nothing containing it`,
      );
    }
  });

  test("\"colombo\" puts the numbered zones first, not suburbs", () => {
    const hits = searchAreas("colombo", { limit: 6 });
    assert.ok(hits.length > 0);
    assert.ok(
      hits.every((a) => a.displayName.startsWith("Colombo")),
      `got: ${hits.map((a) => a.displayName).join(", ")}`,
    );
  });

  test("the shop's own town is findable", () => {
    const hits = searchAreas("wellampitiya");
    assert.equal(hits[0].name, "Wellampitiya");
    assert.ok(hits[0].isLocalAddition);
  });

  test("a shorter exact-ish name outranks a longer one", () => {
    const hits = searchAreas("kandy");
    assert.equal(hits[0].name, "Kandy");
  });

  test("one character returns nothing -- too noisy to be useful", () => {
    assert.deepEqual(searchAreas("c"), []);
    assert.deepEqual(searchAreas(""), []);
  });

  test("nonsense returns nothing rather than a bad guess", () => {
    assert.deepEqual(searchAreas("zzzzqqqq"), []);
  });

  test("respects the limit", () => {
    assert.ok(searchAreas("a", { limit: 3 }).length <= 3);
    assert.ok(searchAreas("ka", { limit: 3 }).length <= 3);
  });

  test("is fast enough for a keystroke on a slow phone", () => {
    const started = performance.now();
    for (let i = 0; i < 50; i++) searchAreas("colo");
    const perSearch = (performance.now() - started) / 50;
    // Generous: the budget is a 16 ms frame, and this needs to be a small
    // fraction of it even on hardware several times slower than CI.
    assert.ok(perSearch < 8, `${perSearch.toFixed(2)}ms per search is too slow`);
  });
});

describe("step-by-step browsing", () => {
  test("there are nine provinces", () => {
    assert.equal(ALL_PROVINCES.length, 9);
  });

  test("Western splits Colombo into the two labelled groups", () => {
    const labels = districtLabelsForProvince("Western");
    assert.ok(labels.includes("Colombo (1-15)"), labels.join(", "));
    assert.ok(labels.includes("Colombo - Greater"), labels.join(", "));
    assert.ok(labels.includes("Gampaha"));
    assert.ok(labels.includes("Kalutara"));
  });

  test("Colombo (1-15) holds the numbered zones", () => {
    const areas = areasForDistrictLabel("Western", "Colombo (1-15)");
    assert.ok(areas.length >= 15, `only ${areas.length}`);
    assert.ok(areas.every((a) => a.district === "Colombo"));
    for (const a of areas) {
      assert.ok(a.postalCode && a.postalCode >= "00100" && a.postalCode <= "01500", `${a.name} ${a.postalCode}`);
    }
  });

  test("Colombo - Greater holds district towns outside that range", () => {
    const areas = areasForDistrictLabel("Western", "Colombo - Greater");
    assert.ok(areas.length > 0);
    assert.ok(areas.every((a) => a.district === "Colombo"));
    assert.ok(areas.some((a) => a.name === "Wellampitiya"), "Wellampitiya belongs here");
  });

  test("every province yields districts, and every district yields areas", () => {
    for (const province of ALL_PROVINCES) {
      const labels = districtLabelsForProvince(province);
      assert.ok(labels.length > 0, `${province} has no districts`);
      for (const label of labels) {
        assert.ok(areasForDistrictLabel(province, label).length > 0, `${province}/${label} is empty`);
      }
    }
  });

  test("browsing reaches every area exactly once", () => {
    let total = 0;
    for (const province of ALL_PROVINCES) {
      for (const label of districtLabelsForProvince(province)) {
        total += areasForDistrictLabel(province, label).length;
      }
    }
    assert.equal(total, ALL_AREAS.length);
  });
});

describe("display formatting", () => {
  test("Colombo zones are zero-padded, as the rest of the app shows them", () => {
    const one = ALL_AREAS.find((a) => a.postalCode === "00100" && a.displayName.startsWith("Colombo"));
    assert.ok(one);
    assert.match(one.displayName, /^Colombo 01/);
    assert.ok(!ALL_AREAS.some((a) => /^Colombo \d( |$)/.test(a.displayName)), "no single-digit labels");
  });

  test("the stored city stays the plain name, not the decorated label", () => {
    const borella = ALL_AREAS.find((a) => a.displayName === "Colombo 08 - Borella");
    assert.ok(borella);
    assert.equal(borella.name, "Colombo 8");
    assert.equal(borella.district, "Colombo");
    assert.equal(borella.province, "Western");
  });
});
