import Link from "next/link";

// What /combo-deals shows when no bundle is available -- either none is
// published, or every one has something inside it that cannot be sold.
//
// Its own component so it can be looked at on its own. Someone who
// clicked "View all Combo Deals" arrived expecting bundles, so this says
// plainly that there are none right now and points somewhere useful,
// rather than leaving them on an empty page.
export function ComboDealsEmpty() {
  return (
    <div
      className="mx-auto mt-12 max-w-xl rounded-[24px] px-6 py-14 text-center"
      style={{ backgroundColor: "#FFF4EC", border: "1px solid #F3D9C6" }}
    >
      <p className="text-[20px] font-extrabold" style={{ color: "#111111" }}>
        No combo deals right now
      </p>
      <p className="mx-auto mt-2 max-w-md text-[15px]" style={{ color: "#6B7280" }}>
        We&apos;re putting new bundles together. In the meantime, everything in the shop is
        available on its own.
      </p>
      <Link
        href="/shop"
        className="mt-7 inline-flex items-center justify-center rounded-[13px] px-7 py-3.5 text-[15px] font-extrabold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#0F2D52] focus-visible:ring-offset-2 focus-visible:outline-none"
        style={{ backgroundColor: "#F97316" }}
      >
        Shop all products
      </Link>
    </div>
  );
}
