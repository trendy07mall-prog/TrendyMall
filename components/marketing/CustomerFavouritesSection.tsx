import { getCachedCustomerFavourites } from "@/lib/data/cached";
import { CustomerFavouritesCarousel } from "@/components/marketing/CustomerFavouritesCarousel";
import { CustomerFavouritesSkeleton } from "@/components/marketing/CustomerFavouritesSkeleton";

// Server half of the homepage's Customer Favourites carousel: it decides
// whether the section exists at all and which mode it runs in, so no
// product data is fetched on the client and the mode can never flip after
// hydration.
//
// getCachedCustomerFavourites returns null when neither Top Rated nor Best
// Sellers can fill a credible carousel (see SECTION_MIN_PRODUCTS), and
// nothing renders in that case -- not an empty shell, not a heading with
// no cards beneath it.
export async function CustomerFavouritesSection() {
  const favourites = await getCachedCustomerFavourites();
  if (!favourites) return null;

  return (
    <CustomerFavouritesCarousel mode={favourites.mode} products={favourites.products} />
  );
}

// Re-exported so the homepage can wrap the async section in a Suspense
// boundary whose fallback is already the right size.
export { CustomerFavouritesSkeleton };
