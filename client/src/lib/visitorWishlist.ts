export const VISITOR_WISHLIST_STORAGE_KEY = "ehode:visitor-wishlist:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function normalizeVisitorWishlist(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)));
}

export function parseVisitorWishlist(raw: string | null): number[] {
  if (!raw) return [];
  try {
    return normalizeVisitorWishlist(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function toggleVisitorWishlistItem(listingIds: number[], listingId: number): number[] {
  const current = normalizeVisitorWishlist(listingIds);
  if (!Number.isInteger(listingId) || listingId < 1) return current;
  return current.includes(listingId) ? current.filter((id) => id !== listingId) : [...current, listingId];
}

export function readVisitorWishlist(storage?: StorageLike): number[] {
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  return target ? parseVisitorWishlist(target.getItem(VISITOR_WISHLIST_STORAGE_KEY)) : [];
}

export function writeVisitorWishlist(listingIds: number[], storage?: StorageLike): void {
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  if (!target) return;
  target.setItem(VISITOR_WISHLIST_STORAGE_KEY, JSON.stringify(normalizeVisitorWishlist(listingIds)));
}
