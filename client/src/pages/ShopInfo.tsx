import { Link, useRoute } from "wouter";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";

const pageContent = {
  privacy: {
    title: "Privacy policy",
    intro: "This page explains how Ehode handles information submitted through the storefront.",
    sections: [
      ["Information you provide", "When you contact Ehode, subscribe to updates, create a buyer account, or complete an order, the information you enter is used to provide the requested service, respond to you, and maintain purchase access."],
      ["Website analytics", "Ehode uses Google Analytics to understand how visitors use the storefront and which pages are useful. Please avoid entering sensitive personal information into public form fields."],
      ["Contact", "For a question about information connected with Ehode, use the Contact page so the owner can respond privately."],
    ],
  },
  refunds: {
    title: "Refund policy",
    intro: "Ehode sells digital downloads. This policy explains how to get help if there is a problem with an order or file.",
    sections: [
      ["Before purchasing", "Please read the product description and included file details before completing checkout."],
      ["Download issues", "If a purchased file is missing, corrupted, or materially different from its listing description, contact Ehode with the order email and product name so the issue can be reviewed."],
      ["Reviewing requests", "Refund and replacement requests are reviewed individually, with attention to whether the digital file was delivered and whether a technical issue can be resolved."],
    ],
  },
  terms: {
    title: "Terms of use",
    intro: "These terms describe the basic use of the Ehode storefront and its digital downloads.",
    sections: [
      ["Digital products", "Products are digital resources. Availability, included file formats, and any listed licence information are shown on each product page."],
      ["Accounts and purchases", "Keep your account and download links private. Buyer accounts are for managing your own purchases and access."],
      ["Acceptable use", "Do not misuse the storefront, attempt to access another buyer’s account or download links, or present Ehode resources as your own work when a product licence does not allow it."],
    ],
  },
  faq: {
    title: "Frequently asked questions",
    intro: "Quick answers about browsing, payment, and digital delivery at Ehode.",
    sections: [
      ["How do I receive a download?", "After a successful payment, eligible digital files are available through the purchase delivery flow. Free resources can be downloaded directly when the file is available."],
      ["Where can I find an order?", "Sign in to your buyer account to view purchases linked to that account. If you need help, contact Ehode with the email used for the order."],
      ["What does File preparing mean?", "The product is visible, but its download file is not yet ready. It cannot be purchased until the file has been uploaded."],
      ["Can I save products for later?", "Yes. Use Wishlist on a product or collection card. Visitors can save items on their device without creating an account."],
    ],
  },
} as const;

type PageKey = keyof typeof pageContent;

export default function ShopInfo() {
  const [, privacyMatch] = useRoute("/privacy");
  const [, refundMatch] = useRoute("/refunds");
  const [, termsMatch] = useRoute("/terms");
  const key: PageKey = privacyMatch ? "privacy" : refundMatch ? "refunds" : termsMatch ? "terms" : "faq";
  const page = pageContent[key];

  return <div className="store-page marketplace-page shop-info-page">
    <StoreHeader/>
    <main className="container shop-info-page__content">
      <p className="eyebrow">Ehode information</p>
      <h1>{page.title}</h1>
      <p className="shop-info-page__intro">{page.intro}</p>
      <div className="shop-info-page__sections">{page.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</div>
      <Link href="/contact" className="marketplace-primary">Contact Ehode</Link>
    </main>
    <StoreFooter/>
  </div>;
}
