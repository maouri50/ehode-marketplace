import { CartDrawer } from "@/components/CartDrawer";
import { StoreHeader } from "@/components/StoreHeader";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/storefront";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Download, PackageCheck, ShoppingBag } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:handle");
  const handle = params?.handle ?? "";
  const { data: product, isLoading } = trpc.storefront.catalog.byHandle.useQuery({ handle }, { enabled: Boolean(handle) });
  const { addItem } = useCart();
  const freeDownload = trpc.storefront.catalog.freeDownload.useMutation({ onSuccess: ({ files }) => { if (files[0]?.url) window.location.assign(files[0].url); } });
  if (isLoading) return <div className="store-page loading-page">Preparing the product details…</div>;
  if (!product) return <div className="store-page not-found-page"><Link href="/">Return to the collection</Link><h1>This resource is not available.</h1></div>;
  const ready = product.assetCount > 0;
  const isFree = Number(product.priceAmount) === 0;
  const actionLabel = !ready ? "File preparing" : isFree ? freeDownload.isPending ? "Preparing…" : "Download free" : "Add to basket";
  return <div className="store-page marketplace-page"><StoreHeader/><main className="product-detail container marketplace-listing"><Link href="/#collection" className="back-link"><ArrowLeft size={15}/> Back to all downloads</Link><div className="product-detail__grid"><section className="product-detail__visual marketplace-listing__visual">{product.coverImageUrl ? <img src={product.coverImageUrl} alt={product.title}/> : <div className="image-placeholder"/>}</section><section className="product-detail__content marketplace-listing__content"><p className="marketplace-listing__crumb">{product.category ?? product.productType ?? "Digital resource"}</p><h1>{product.title}</h1><p className="marketplace-listing__byline">Designed by Ehode Studio</p><div className="marketplace-purchase-card"><p className="product-detail__price">{isFree ? "Free download" : formatMoney(product.priceAmount, product.currencyCode)}</p><p className="marketplace-purchase-card__copy">{isFree ? "No checkout required · file opens directly" : "Digital item · Available after payment confirmation"}</p><button type="button" className="marketplace-primary product-detail__add" disabled={!ready || freeDownload.isPending} onClick={() => isFree ? freeDownload.mutate({ listingId: product.id }) : addItem(product)}><ShoppingBag size={18}/>{actionLabel}</button><p className="marketplace-purchase-card__secure"><Check size={15}/>{isFree ? "Free file delivery from Ehode" : "Secure checkout through PayPal"}</p></div><div className="product-detail__tags">{product.productType ? <span>{product.productType}</span> : null}{product.licenseName ? <span>{product.licenseName}</span> : null}</div><p className="product-detail__description">{product.description}</p><div className="product-assurance"><div><Download size={16}/><span><strong>Digital delivery</strong>{ready ? isFree ? "This free resource is available for immediate download." : "Your file becomes available in a private download page after PayPal confirms payment." : "This resource will become purchasable after its download file is uploaded."}</span></div><div><PackageCheck size={16}/><span><strong>{product.licenseName ?? "License included"}</strong>License information is included with this product listing.</span></div></div></section></div></main><CartDrawer/></div>;
}
