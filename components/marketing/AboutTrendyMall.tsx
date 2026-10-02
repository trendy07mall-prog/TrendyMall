import Link from "next/link";

// Homepage-only prose block, sitting between the page content and the
// footer.
//
// HOMEPAGE ONLY, on purpose. The footer's link row belongs on every page
// because links are what crawlers follow. A paragraph of prose is the
// opposite: the same text repeated on 35+ pages is duplicate boilerplate
// that dilutes rather than helps. One page, written once.
//
// Everything it claims is checked against live settings:
//
//   * Rs 255 / Rs 400 -- delivery_zones ("Colombo 1-15" and
//     "Wellampitiya" are both 255, the default "Other Sri Lanka" is 400).
//     NOT Rs 250, which is what the brief asked for; the rate in the
//     database is what customers are actually charged.
//   * Wellampitiya -- general.address.
//   * The five product groups -- all have live, non-empty categories.
//
// Nothing here repeats what the footer already says: no COD, no returns
// window, no phone, no address block, no Company links.
//
// No client JavaScript. The "Read more" affordance is a hidden checkbox
// and its label, styled in globals.css under .about-trendymall -- on
// phones the paragraph is CLAMPED to four lines and checking the box
// unclamps it; from sm: up the toggle is hidden and the full text always
// shows.
//
// Clamped, never hidden: the complete paragraph is in the HTML and in the
// rendered page in every state, so a crawler reads all of it without
// touching anything.
//
// This started as <details>/<summary>, which is the obvious choice and
// does not work. Current Chromium hides a closed <details>' content
// through ::details-content and content-visibility rather than a plain
// `display: none` on the child, so the CSS that was meant to force it
// open on desktop had no effect and the paragraph simply never rendered
// there. A checkbox is less elegant and actually works.
export function AboutTrendyMall() {
  return (
    <section
      aria-labelledby="about-trendymall-heading"
      className="about-trendymall border-t border-[#E5E7EB] bg-[#FAFAFA] px-6 py-12 sm:py-14"
    >
      <div className="mx-auto w-full max-w-3xl sm:text-center">
        <p className="text-[11px] font-bold tracking-wider text-[#F97316] uppercase">
          About TrendyMall
        </p>
        <h2
          id="about-trendymall-heading"
          className="font-heading mt-2 text-xl font-bold tracking-tight text-[#0F2D52] sm:text-2xl"
        >
          Shop Mobile Accessories Online with TrendyMall
        </h2>

        <div className="about-trendymall__more mt-4">
          {/* Visually hidden, but a real focusable control: the label
              below is its trigger, so the toggle works by keyboard as
              well as by tap. */}
          <input
            type="checkbox"
            id="about-trendymall-more"
            className="about-trendymall__checkbox"
          />
          <p className="about-trendymall__text text-sm leading-relaxed text-[#111111]/80 sm:text-[15px]">
            TrendyMall is an online store for mobile accessories in Sri Lanka, based in
            Wellampitiya. We stock everyday tech at fair prices —{" "}
            <Link href="/category/earbuds" className="footer-prose-link">
              wireless earbuds
            </Link>
            ,{" "}
            <Link href="/category/headsets-headphones" className="footer-prose-link">
              headphones
            </Link>{" "}
            and neckbands,{" "}
            <Link href="/category/portable-speakers" className="footer-prose-link">
              Bluetooth speakers
            </Link>
            ,{" "}
            <Link href="/category/power-bank" className="footer-prose-link">
              power banks
            </Link>
            , and{" "}
            <Link href="/category/trimmers-groomers-clippers" className="footer-prose-link">
              hair trimmers and clippers
            </Link>{" "}
            — with{" "}
            <Link href="/new-arrivals" className="footer-prose-link">
              new arrivals
            </Link>{" "}
            added regularly. Delivery is Rs 255 within Colombo 1–15 and Wellampitiya, and Rs
            400 to the rest of Sri Lanka.
          </p>
          <label htmlFor="about-trendymall-more" className="about-trendymall__toggle">
            Read more
          </label>
        </div>
      </div>
    </section>
  );
}
