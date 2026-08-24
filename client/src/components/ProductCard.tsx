import { useCart } from "@/contexts/CartContext";
import { useVisitorWishlist } from "@/contexts/VisitorWishlistContext";
import { formatMoney, type StorefrontListing } from "@/lib/storefront";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Download, Heart, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

export function ProductCard({ product }: { product: StorefrontListing }) {
  const { addItem } = useCart();
  const visitorWishlist = useVisitorWishlist();
  const freeDownload = trpc.storefront.catalog.freeDownload.useMutation({ onSuccess: ({ files }) => { if (files[0]?.url) window.location.assign(files[0].url); } });
  const ready = product.assetCount > 0;
  const isFree = Number(product.priceAmount) === 0;
  const saved = visitorWishlist.hasListing(product.id);

  return <article className="product-card marketplace-product-card">
    <Link href={`/products/${product.handle}`} className="product-card__image" aria-label={`View ${product.title}`}>
      {product.coverImageUrl ? <img src={product.coverImageUrl} alt={product.title} loading="lazy"/> : <div className="image-placeholder"/>}
      <span className="product-card__open"><ArrowUpRight size={17}/></span>
      {!ready ? <span className="product-card__notice"><Download size={13}/> File preparing</span> : null}
    </Link>
    <div className="product-card__content">
      <p className="product-card__type">{product.category ?? product.productType ?? "Digital resource"}</p>
      <Link href={`/products/${product.handle}`} className="product-card__title">{product.title}</Link>
      <p className="product-card__delivery"><Download size={13}/> Instant digital download</p>
      <div className="product-card__bottom">
        <span>{isFree ? "Free" : formatMoney(product.priceAmount, product.currencyCode)}</span>
        <div className="product-card__actions">
          <button type="button" className={saved ? "product-card__wishlist is-saved" : "product-card__wishlist"} aria-label={`${saved ? "Remove" : "Save"} ${product.title} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved} onClick={() => visitorWishlist.toggleListing(product.id)}>
            <Heart size={16} fill={saved ? "currentColor" : "none"}/><span className="sr-only">{saved ? "Saved" : "Save to wishlist"}</span>
          </button>
          <button type="button" className="add-button" disabled={!ready || freeDownload.isPending} onClick={() => isFree ? freeDownload.mutate({ listingId: product.id }) : addItem(product)}>
            <ShoppingBag size={15}/>{!ready ? "Preparing" : isFree ? freeDownload.isPending ? "Preparing…" : "Download free" : "Add to bag"}
          </button>
        </div>
      </div>
    </div>
  </article>;
}
