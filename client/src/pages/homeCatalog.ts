import type { StorefrontListing } from "@/lib/storefront";

export function filterHomeCatalog(products: StorefrontListing[], category: string | null, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return products.filter((product) => {
    const matchesCategory = !category || product.categoryHandle === category;
    const searchable = `${product.title} ${product.description ?? ""} ${product.category ?? ""}`.toLowerCase();
    return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}
