import { AsyncLocalStorage } from "node:async_hooks";

// Marks "we are currently inside a cached, non-personalised read".
//
// The alternative was threading an optional client argument through every
// data function -- but the storefront's reads nest (getNewArrivals calls
// helpers that call createClient() again, several levels down), so that
// would have meant touching a long tail of functions and would break
// silently the moment someone added another nested helper and forgot.
//
// This flag is always established INSIDE the cached callback itself (see
// lib/data/cached.ts), never around it, so it never has to survive
// Next.js's own cache boundary -- only ordinary async calls beneath it,
// which AsyncLocalStorage propagates reliably.
const publicScope = new AsyncLocalStorage<true>();

export function runInPublicScope<T>(fn: () => Promise<T>): Promise<T> {
  return publicScope.run(true, fn);
}

export function isPublicScope(): boolean {
  return publicScope.getStore() === true;
}
