import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { RealtimeClient } from "./realtime-stub";

/**
 * The safety net for the realtime alias in next.config.ts.
 *
 * next.config.ts replaces @supabase/realtime-js with realtime-stub.ts, so
 * the ~54 KB websocket stack stops shipping to visitors who never use it.
 * That is only safe for as long as the stub implements everything
 * supabase-js actually calls on its realtime client.
 *
 * Rather than trusting a note, this test READS the installed supabase-js
 * bundle, extracts every `this.realtime.<method>` call site, and asserts
 * the stub has each one. Upgrade supabase-js to a version that calls
 * something new and this fails in CI, naming the method -- instead of the
 * site breaking in production with a TypeError nobody can place.
 *
 * IF THIS TEST FAILS after a supabase-js upgrade:
 *   1. Add the missing method to realtime-stub.ts (a no-op is almost
 *      always right -- see the notes in that file).
 *   2. Re-run the flow check by hand: homepage, product, add to cart,
 *      /cart, /checkout, /login, /signup must all load with no console
 *      errors. Auth is the one that matters -- setAuth is the only
 *      stubbed method reached in normal use.
 *   3. If realtime is genuinely wanted, delete the alias instead.
 */

const require_ = createRequire(import.meta.url);

function supabaseBundleSource(): string {
  // Resolved through the package rather than hardcoded, so this follows
  // the installed version wherever it lives.
  const entry = require_.resolve("@supabase/supabase-js");
  // The CJS entry sits beside the ESM one; either contains the same calls.
  return readFileSync(entry, "utf8");
}

test("the stub implements every realtime method supabase-js calls", () => {
  const source = supabaseBundleSource();

  const called = new Set(
    [...source.matchAll(/\.realtime\.([a-zA-Z_$][\w$]*)/g)].map((m) => m[1]),
  );

  assert.ok(
    called.size > 0,
    "Found no .realtime.* calls in supabase-js. The bundle shape changed, so this " +
      "test is no longer checking anything -- fix the extraction before trusting it.",
  );

  const stub = new RealtimeClient() as unknown as Record<string, unknown>;
  const missing = [...called].filter((name) => typeof stub[name] !== "function");

  assert.deepEqual(
    missing,
    [],
    `supabase-js calls realtime method(s) the stub does not implement: ${missing.join(", ")}. ` +
      "Add them to lib/supabase/realtime-stub.ts, then re-run the login/cart/checkout flow check.",
  );
});

test("the five methods known at the time of writing are still all present", () => {
  // A floor under the test above: if the extraction regex ever silently
  // stops matching, this still catches a stub that lost a method.
  const stub = new RealtimeClient() as unknown as Record<string, unknown>;
  for (const name of ["setAuth", "channel", "getChannels", "removeChannel", "removeAllChannels"]) {
    assert.equal(typeof stub[name], "function", `stub is missing ${name}()`);
  }
});

test("setAuth is a no-op and never throws -- it runs on every auth change", () => {
  const stub = new RealtimeClient();
  assert.doesNotThrow(() => stub.setAuth());
  assert.equal(stub.setAuth(), undefined);
});

test("the channel-returning methods behave like an empty client", async () => {
  const stub = new RealtimeClient();
  assert.deepEqual(stub.getChannels(), []);
  assert.equal(await stub.removeChannel(), "ok");
  assert.deepEqual(await stub.removeAllChannels(), []);
});

test("channel() throws loudly rather than silently doing nothing", () => {
  // A no-op here would be a subscription that never fires: far harder to
  // diagnose than an error naming the file to edit.
  const stub = new RealtimeClient();
  assert.throws(() => stub.channel(), /realtime is not bundled/i);
});

test("the pinned supabase-js version is the one this stub was verified against", () => {
  // The alias is a bundler-level override of a third-party package's
  // internals, so the dependency is pinned exactly (no ^) and this test
  // fails if that pin is loosened or moved without re-verifying.
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const declared = pkg.dependencies["@supabase/supabase-js"];
  assert.equal(
    declared,
    "2.110.7",
    `@supabase/supabase-js is declared as "${declared}". The realtime alias was verified ` +
      "against exactly 2.110.7. If you are upgrading on purpose: update this expectation, " +
      "re-run the login/cart/checkout flow check, and confirm the stub test above still passes.",
  );
  assert.ok(!String(declared).startsWith("^"), "must be pinned exactly, not a ^ range");
});
