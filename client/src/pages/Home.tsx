import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { StoreHeader } from "@/components/StoreHeader";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ChevronRight, Download, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { filterHomeCatalog } from "./homeCatalog";

export default function Home() {
  const { data: products = [], isLoading, error } = trpc.storefront.catalog.list.useQuery({});
  const { data: categories = [] } = trpc.storefront.catalog.categories.useQuery();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const visible = useMemo(() => filterHomeCatalog(products, category, query), [products, category, query]);
  const heroCover = products.find((product) => product.coverImageUrl)?.coverImageUrl;

  const resetCollection = () => {
    setCategory(null);
    setQuery("");
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="store-page marketplace-page optimistic-page">
      <StoreHeader />
      <main>
        <section className="marketplace-hero optimistic-hero">
          <div className="container marketplace-hero__grid">
            <div className="marketplace-hero__copy optimistic-hero__copy">
              <span className="marketplace-kicker"><Sparkles size={14} /> Original digital goods</span>
              <h1><span>Good</span><em>ideas</em><strong>inside.</strong></h1>
              <p>Templates, printables, and creative tools for the projects you want to make real.</p>
              <div className="marketplace-hero__actions">
                <a href="#collection" className="marketplace-primary">Shop downloads <ArrowRight size={17} /></a>
                <a href="#how-it-works" className="marketplace-text-link">How it works <ChevronRight size={16} /></a>
              </div>
              <div className="marketplace-hero__benefits">
                <span><Download size={15} /> Instant access after payment</span>
                <span><ShieldCheck size={15} /> Secure PayPal checkout</span>
              </div>
            </div>
            <div className="optimistic-hero__showcase" aria-hidden="true">
              <span className="optimistic-flower optimistic-flower--one" />
              <span className="optimistic-flower optimistic-flower--two" />
              <span className="optimistic-flower optimistic-flower--three" />
              <div className="optimistic-hero__plinth" />
              <div className="optimistic-hero__vase"><span /><span /></div>
              <div className="optimistic-hero__screen">
                <div className="optimistic-hero__screen-sky" />
                <div className="optimistic-hero__screen-cloud optimistic-hero__screen-cloud--one" />
                <div className="optimistic-hero__screen-cloud optimistic-hero__screen-cloud--two" />
              </div>
              <div className="optimistic-hero__resource">
                {heroCover ? <img src={heroCover} alt="" /> : <span>EHODE<br />IDEAS</span>}
              </div>
              <div className="optimistic-hero__arch" />
              <div className="optimistic-hero__lamp" />
            </div>
          </div>
        </section>

        <section className="marketplace-categories optimistic-categories" id="categories">
          <div className="container">
            <div className="marketplace-categories__heading"><span>Find your next favourite</span><a href="#collection">View all <ChevronRight size={15} /></a></div>
            <div className="marketplace-categories__row">
              <button className={!category ? "is-selected" : ""} type="button" onClick={resetCollection}>All downloads</button>
              {categories.map((item) => <button type="button" className={category === item.handle ? "is-selected" : ""} key={item.id} onClick={() => { setCategory(item.handle); setQuery(""); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }}><span>{item.name}</span><small>{item.description}</small></button>)}
            </div>
          </div>
        </section>

        <section className="marketplace-catalog container" id="collection">
          <div className="marketplace-catalog__intro">
            <div><span className="eyebrow">Fresh from Ehode</span><h2>Choose a good idea.</h2></div>
            <p>Useful tools for planning, printing, designing, and making your next thing.</p>
          </div>
          <div className="marketplace-search-row">
            <label className="marketplace-search" id="catalog-search"><Search size={18} /><span className="sr-only">Search the collection</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates, SVGs, printables and more" /></label>
            <div className="marketplace-search-row__result"><strong>{visible.length}</strong> {visible.length === 1 ? "result" : "results"}</div>
          </div>
          <div className="marketplace-filter-row">
            <button className={!category ? "is-active" : ""} type="button" onClick={() => setCategory(null)}>All</button>
            {categories.map((item) => <button type="button" className={category === item.handle ? "is-active" : ""} onClick={() => setCategory(item.handle)} key={item.id}>{item.name}</button>)}
          </div>
          {isLoading ? <div className="product-grid product-grid--skeleton"><div /><div /><div /><div /></div> : null}
          {error ? <div className="catalog-state"><h3>The collection is taking a moment.</h3><p>Please refresh to try again.</p></div> : null}
          {!isLoading && !error && visible.length === 0 ? <div className="catalog-state"><h3>No matching downloads found.</h3><p>Try a different word or return to the whole collection.</p><button type="button" onClick={resetCollection}>Show all downloads</button></div> : null}
          {visible.length > 0 ? <div className="product-grid marketplace-product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div> : null}
        </section>

        <section className="marketplace-reassurance" id="how-it-works">
          <div className="container marketplace-reassurance__grid">
            <div><span className="eyebrow">Simple from start to finish</span><h2>See it. Get it.<br />Make it yours.</h2></div>
            <div className="marketplace-reassurance__items">
              <article><span>01</span><div><strong>Find a useful resource</strong><p>Browse by project type, collection, or creative need.</p></div></article>
              <article><span>02</span><div><strong>Pay safely with PayPal</strong><p>Your payment is handled securely through PayPal checkout.</p></div></article>
              <article><span>03</span><div><strong>Download after purchase</strong><p>Your file access appears once payment is confirmed.</p></div></article>
            </div>
          </div>
        </section>

        <section className="marketplace-studio container" id="about">
          <div><span className="eyebrow">Meet Ehode</span><h2>A small shop with big creative energy.</h2><p>Ehode is a focused one-seller studio for clear, useful digital resources. Everything is selected from one place today, with room to grow later.</p></div>
          <div className="marketplace-studio__card"><Download size={24} /><strong>Digital by design</strong><span>Protected delivery after verified payment, with no waiting for physical shipping.</span><Link href="/admin">Admin workspace <ChevronRight size={15} /></Link></div>
        </section>
      </main>
      <footer className="store-footer marketplace-footer"><div className="container"><span className="store-brand">ehode<span>.</span></span><p>Digital downloads for makers, planners, and creative projects.</p><small>© {new Date().getFullYear()} Ehode. Independent digital goods.</small></div></footer>
      <CartDrawer />
    </div>
  );
}
