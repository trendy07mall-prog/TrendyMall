import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { suggestEmailCorrection } from "./email-typo";

describe("suggestEmailCorrection", () => {
  test("catches the typos customers actually make", () => {
    assert.equal(suggestEmailCorrection("ann@gmial.com"), "ann@gmail.com");
    assert.equal(suggestEmailCorrection("ann@gmail.con"), "ann@gmail.com");
    assert.equal(suggestEmailCorrection("ann@gmail.co"), "ann@gmail.com");
    assert.equal(suggestEmailCorrection("ann@yahooo.com"), "ann@yahoo.com");
    assert.equal(suggestEmailCorrection("ann@hotmial.com"), "ann@hotmail.com");
    assert.equal(suggestEmailCorrection("ann@outlook.con"), "ann@outlook.com");
  });

  test("says nothing about an address that is already correct", () => {
    for (const ok of [
      "ann@gmail.com",
      "ann@yahoo.com",
      "ann@outlook.com",
      "ann@icloud.com",
      "ann@sltnet.lk",
    ]) {
      assert.equal(suggestEmailCorrection(ok), null, `${ok} should not be second-guessed`);
    }
  });

  test("leaves an unusual but legitimate domain alone", () => {
    // The whole point of being a suggestion and not a block.
    assert.equal(suggestEmailCorrection("ann@trendymall.online"), null);
    assert.equal(suggestEmailCorrection("ann@mycompany.lk"), null);
    assert.equal(suggestEmailCorrection("ann@university.ac.lk"), null);
  });

  test("ignores anything that is not yet an address", () => {
    for (const partial of ["", "ann", "ann@", "@gmail.com", "ann@gmail", "   "]) {
      assert.equal(suggestEmailCorrection(partial), null, `${partial || "(empty)"}`);
    }
  });

  test("preserves the local part exactly, and is case-insensitive", () => {
    assert.equal(suggestEmailCorrection("First.Last+tag@GMIAL.COM"), "first.last+tag@gmail.com");
  });

  test("does not reach for a domain that is nothing like what was typed", () => {
    assert.equal(suggestEmailCorrection("ann@zzzzzzzz.com"), null);
  });
});
