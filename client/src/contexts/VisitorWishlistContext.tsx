import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readVisitorWishlist, toggleVisitorWishlistItem, writeVisitorWishlist } from "@/lib/visitorWishlist";

type VisitorWishlistContextValue = {
  listingIds: number[];
  hasListing: (listingId: number) => boolean;
  toggleListing: (listingId: number) => void;
};

const VisitorWishlistContext = createContext<VisitorWishlistContextValue | null>(null);

export function VisitorWishlistProvider({ children }: { children: ReactNode }) {
  const [listingIds, setListingIds] = useState<number[]>(readVisitorWishlist);

  useEffect(() => {
    writeVisitorWishlist(listingIds);
  }, [listingIds]);

  const toggleListing = useCallback((listingId: number) => {
    setListingIds((current) => toggleVisitorWishlistItem(current, listingId));
  }, []);

  const value = useMemo(() => ({
    listingIds,
    hasListing: (listingId: number) => listingIds.includes(listingId),
    toggleListing,
  }), [listingIds, toggleListing]);

  return <VisitorWishlistContext.Provider value={value}>{children}</VisitorWishlistContext.Provider>;
}

export function useVisitorWishlist() {
  const context = useContext(VisitorWishlistContext);
  if (!context) throw new Error("useVisitorWishlist must be used within VisitorWishlistProvider");
  return context;
}
