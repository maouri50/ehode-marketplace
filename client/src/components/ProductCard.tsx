import { useCart } from "@/contexts/CartContext";
import { formatMoney, type StorefrontListing } from "@/lib/storefront";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Download, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

export function ProductCard({ product }: { product: StorefrontListing }) {
  const { addItem } = useCart();
  const freeDownload = trpc.storefront.catalog.freeDownload.useMutation({ onSuccess: ({ files }) => { if (files[0]?.url) window.location.assign(files[0].url); } });
  const ready = product.assetCount > 0;
  const isFree = Number(product.priceAmount) === 0;
  return <article className="product-card marketplace-product-card"><Link href={`/products/${product.handle}`} className="product-card__image" aria-label={`View ${product.title}`}>{product.coverImageUrl ? <img src={product.coverImageUrl} alt={product.title} loading="lazy"/> : <div className="image-placeholder"/>}<span className="product-card__open"><ArrowUpRight size={17}/></span>{!ready ? <span className="product-card__notice"><Download size={13}/> File preparing</span> : null}</Link><div className="product-card__content"><p className="product-card__type">{product.category ?? product.productType ?? "Digital resource"}</p><Link href={`/products/${product.handle}`} className="product-card__title">{product.title}</Link><p className="product-card__delivery"><Download size={13}/> Instant digital download</p><div className="product-card__bottom"><span>{isFree ? "Free" : formatMoney(product.priceAmount, product.currencyCode)}</span><button type="button" className="add-button" disabled={!ready || freeDownload.isPending} onClick={() => isFree ? freeDownload.mutate({ listingId: product.id }) : addItem(product)}><ShoppingBag size={15}/>{!ready ? "Preparing" : isFree ? freeDownload.isPending ? "Preparing…" : "Download free" : "Add to bag"}</button></div></div></article>;
}
