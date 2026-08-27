import { CartDrawer } from "@/components/CartDrawer";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { useCart } from "@/contexts/CartContext";
import { useVisitorWishlist } from "@/contexts/VisitorWishlistContext";
import { formatMoney } from "@/lib/storefront";
import { scrollProductPageToStart } from "@/lib/productScroll";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Copy, Download, Heart, Mail, PackageCheck, Share2, ShoppingBag, Star } from "lucide-react";
import { useLayoutEffect } from "react";
import { Link, useRoute } from "wouter";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:handle");
  const handle = params?.handle ?? "";
  useLayoutEffect(() => {
    scrollProductPageToStart();
  }, [handle]);
  const { data: product, isLoading } = trpc.storefront.catalog.byHandle.useQuery({ handle }, { enabled: Boolean(handle) });
  const buyer = trpc.buyer.me.useQuery(undefined, { refetchOnWindowFocus: false });
  const wishlist = trpc.buyer.wishlist.list.useQuery(undefined, { enabled: Boolean(buyer.data) });
  const visitorWishlist = useVisitorWishlist();
  const utils = trpc.useUtils();
  const addWishlist = trpc.buyer.wishlist.add.useMutation({ onSuccess: () => utils.buyer.wishlist.list.invalidate() });
  const removeWishlist = trpc.buyer.wishlist.remove.useMutation({ onSuccess: () => utils.buyer.wishlist.list.invalidate() });
  const { addItem } = useCart();
  const freeDownload = trpc.storefront.catalog.freeDownload.useMutation({ onSuccess: ({ files }) => { if (files[0]?.url) window.location.assign(files[0].url); } });
  if (isLoading) return <div className="store-page loading-page">Preparing the product details…</div>;
  if (!product) return <div className="store-page not-found-page"><Link href="/">Return to the collection</Link><h1>This resource is not available.</h1></div>;
  const ready = product.assetCount > 0;
  const isFree = Number(product.priceAmount) === 0;
  const saved = buyer.data ? Boolean(wishlist.data?.some((item) => item.listingId === product.id)) : visitorWishlist.hasListing(product.id);
  const actionLabel = !ready ? "File preparing" : isFree ? freeDownload.isPending ? "Preparing…" : "Download free" : "Add to basket";
  const productUrl = typeof window === "undefined" ? "" : window.location.href;
  const share = (kind: "facebook" | "pinterest" | "email" | "copy") => { const encodedUrl = encodeURIComponent(productUrl); const text = encodeURIComponent(`Take a look at ${product.title} from Ehode`); if (kind === "copy") { void navigator.clipboard?.writeText(productUrl); return; } const target = kind === "facebook" ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` : kind === "pinterest" ? `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${text}` : `mailto:?subject=${text}&body=${encodedUrl}`; window.open(target, "_blank", "noopener,noreferrer"); };
  const toggleWishlist = () => { if (!buyer.data) { visitorWishlist.toggleListing(product.id); return; } if (saved) removeWishlist.mutate({ listingId: product.id }); else addWishlist.mutate({ listingId: product.id }); };
  return <div className="store-page marketplace-page"><StoreHeader/><main className="product-detail container marketplace-listing"><Link href="/#collection" className="back-link"><ArrowLeft size={15}/> Back to all downloads</Link><div className="product-detail__grid"><section className="product-detail__visual marketplace-listing__visual">{product.coverImageUrl ? <img src={product.coverImageUrl} alt={product.title}/> : <div className="image-placeholder"/>}</section><section className="product-detail__content marketplace-listing__content"><p className="marketplace-listing__crumb">{product.category ?? product.productType ?? "Digital resource"}</p><h1>{product.title}</h1><p className="marketplace-listing__byline">Designed by Ehode Studio</p><div className="marketplace-purchase-card"><p className="product-detail__price">{isFree ? "Free download" : formatMoney(product.priceAmount, product.currencyCode)}</p><p className="marketplace-purchase-card__copy">{isFree ? "No checkout required · file opens directly" : "Digital item · Available after payment confirmation"}</p><button type="button" className="marketplace-primary product-detail__add" disabled={!ready || freeDownload.isPending} onClick={() => isFree ? freeDownload.mutate({ listingId: product.id }) : addItem(product)}><ShoppingBag size={18}/>{actionLabel}</button><p className="marketplace-purchase-card__secure"><Check size={15}/>{isFree ? "Free file delivery from Ehode" : "Secure checkout through PayPal"}</p></div><div className="product-social"><div><span>Pretty things need sharing</span><div className="product-social__buttons"><button type="button" aria-label="Share on Facebook" onClick={() => share("facebook")}>f</button><button type="button" aria-label="Share on Pinterest" onClick={() => share("pinterest")}>p</button><button type="button" aria-label="Share by email" onClick={() => share("email")}><Mail size={15}/></button><button type="button" aria-label="Copy product link" onClick={() => share("copy")}><Copy size={14}/></button></div></div><button type="button" className={saved ? "wishlist-button is-saved" : "wishlist-button"} onClick={toggleWishlist}><Heart size={16} fill={saved ? "currentColor" : "none"}/>{saved ? "Saved" : "Wishlist"}</button></div><div className="product-detail__tags">{product.productType ? <span>{product.productType}</span> : null}{product.licenseName ? <span>{product.licenseName}</span> : null}</div><p className="product-detail__description">{product.description}</p><div className="product-assurance"><div><Download size={16}/><span><strong>Digital delivery</strong>{ready ? isFree ? "This free resource is available for immediate download." : "Your file becomes available in a private download page after PayPal confirms payment." : "This resource will become purchasable after its download file is uploaded."}</span></div><div><PackageCheck size={16}/><span><strong>{product.licenseName ?? "License included"}</strong>License information is included with this product listing.</span></div></div></section></div><ProductReviews listingId={product.id}/></main><StoreFooter/><CartDrawer/></div>;
}

function ProductReviews({ listingId }: { listingId: number }) {
  const reviews = trpc.storefront.reviews.list.useQuery({ listingId });
  return <section className="product-reviews"><div><h2>Buyer reviews</h2></div>{reviews.data?.length ? <div className="product-review-grid">{reviews.data.map((review) => <article key={review.id}><div className="product-review-stars">{Array.from({ length: review.rating }, (_, index) => <Star key={index} size={15} fill="currentColor"/>)}</div><p>{review.body}</p><strong>{review.displayName}</strong><small>Verified purchase</small></article>)}</div> : <div className="product-reviews__empty"><Share2 size={18}/><span>No buyer reviews yet.</span></div>}</section>;
}
