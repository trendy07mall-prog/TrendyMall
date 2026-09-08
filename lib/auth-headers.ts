// Shared between proxy.ts (which sets it) and app/admin/layout.tsx (which
// reads it). It lives in its own module rather than being exported from
// proxy.ts so the layout can import the name without pulling the whole
// proxy module -- and its edge-runtime imports -- into the page bundle.
//
// One definition, two consumers, for the same reason lib/cache-tags.ts
// exists: a header name that drifts between writer and reader fails
// silently, and here that failure would be "the layout quietly falls back
// to an extra auth round trip forever" -- a performance regression nobody
// would notice.
//
// SECURITY: see the note in proxy.ts. This header is only meaningful
// because the proxy deletes any inbound copy before it can be set, so it
// can never carry a client-supplied value.
export const VERIFIED_USER_HEADER = "x-tm-verified-user-id";
