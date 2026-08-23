export type StorefrontListing = {
  id: number;
  handle: string;
  title: string;
  description: string | null;
  productType: string | null;
  priceAmount: string;
  currencyCode: string;
  coverImageUrl: string | null;
  licenseName: string | null;
  featured?: number;
  category?: string | null;
  categoryHandle?: string | null;
  assetCount: number;
};

export function formatMoney(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(Number(amount));
}
