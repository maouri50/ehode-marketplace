import { Link, useRoute } from "wouter";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";

export const pageContent = {
  shop: {
    title: "Shop info",
    intro: "Ehode is an independent digital-download shop for useful printables, design bundles, and creative resources.",
    sections: [
      ["What Ehode sells", "Every listing is a digital resource. Product pages explain what is included, the available file formats, and whether the download is ready before you purchase."],
      ["Buying and delivery", "Paid downloads become available after PayPal confirms payment. When a product is marked File preparing, its download has not yet been uploaded and checkout is unavailable."],
      ["Free resources", "Free digital downloads can be downloaded directly only when the product file is ready. They do not require a payment checkout."],
      ["Choosing the right resource", "Please review the product description, preview images, file formats, and licence information before purchasing. If you are unsure whether a product fits your software or project, contact Ehode before checkout."],
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "Last updated: August 25, 2026. This page explains how Ehode handles information connected with the storefront.",
    sections: [
      ["Information collected", "Ehode receives the information you submit when you contact the shop, join the newsletter, create a buyer account, or complete an order. This can include your name, email address, account information, order details, and message content. When a download is delivered, Ehode also receives technical request data from its host, including the public IP address and approximate country associated with that address."],
      ["How information is used", "Information is used to operate the storefront, process and deliver eligible downloads, provide purchase access, respond to support requests, and protect the service. For download delivery, the IP address and approximate country are sent only to the owner in a private notification to help investigate delivery or security issues; Ehode does not save that alert data in its application database. Marketing emails are sent only when you choose to subscribe."],
      ["Payments and service providers", "PayPal processes payment information during checkout. Ehode uses service providers for hosting, email delivery, secure file delivery, private owner alerts, and website analytics. Those services may process information needed to perform their role."],
      ["Cookies and analytics", "Ehode uses cookies and similar browser storage to support features such as the basket, sign-in, saved items, and site preferences. Google Analytics loads only after you select Accept in the cookie notice."],
      ["Your choices", "You may unsubscribe from marketing emails using the unsubscribe link in a newsletter. To request help with account, order, or privacy information, use the Contact page and include the email connected with the request."],
    ],
  },
  refunds: {
    title: "Refund policy",
    intro: "Last updated: August 25, 2026. Ehode sells digital downloads, not physical goods. This policy explains what to expect before and after purchase.",
    sections: [
      ["Digital-download nature", "Digital files cannot be returned once they have been delivered or accessed. Please review the description, preview images, file formats, and licence information before purchasing."],
      ["Technical problems", "If a purchased file is missing, corrupted, inaccessible, or materially different from its listing description, contact Ehode with the order email, product name, and a short description of the issue. Ehode will review the problem and aim to provide appropriate support or a corrected file where possible."],
      ["Refund requests", "Requests are reviewed individually. The review considers the listing information, delivery status, download access, and whether a technical problem can be resolved. A refund is not automatic simply because a digital file has already been delivered."],
      ["Before you buy", "If you need help checking compatibility or understanding the stated licence, contact Ehode before checkout so you can make an informed choice."],
    ],
  },
  terms: {
    title: "Terms of use",
    intro: "Last updated: August 25, 2026. These terms describe the basic use of the Ehode storefront and its digital downloads.",
    sections: [
      ["Digital products and licences", "Products are digital resources. Each product page states the available file details and any listed licence information. Your use of a resource must follow the licence stated on that product page."],
      ["Accounts, orders, and downloads", "Keep your buyer account, order emails, receipt links, and download links private. Download access is tied to the eligible order and should not be shared, posted, or used to access another buyer’s purchase."],
      ["Acceptable use", "Do not misuse the storefront, interfere with its security, attempt to access another account or order, redistribute a digital resource outside its stated licence, or present the resource as your own original work where the licence does not allow it."],
      ["Changes", "Ehode may update product listings, shop information, and these terms as the storefront changes. The current version is displayed on this page."],
    ],
  },
  faq: {
    title: "Frequently asked questions",
    intro: "Quick answers about browsing, payment, support, and digital delivery at Ehode.",
    sections: [
      ["How do I receive a download?", "After a successful payment, eligible digital files are available through the purchase delivery flow. Free resources can be downloaded directly when the file is available."],
      ["Where can I find an order?", "Sign in to your buyer account to view purchases linked to that account. If you need help, contact Ehode with the email used for the order."],
      ["What does File preparing mean?", "The product is visible, but its download file is not yet ready. It cannot be purchased until the file has been uploaded."],
      ["Can I save products for later?", "Yes. Use Wishlist on a product or collection card. Visitors can save items on their device without creating an account."],
      ["What if my download does not work?", "Use Contact and include the order email, product name, and a short explanation. The owner receives Contact messages privately and can reply to the email you provide."],
      ["Can I get an item that is still preparing?", "Not yet. A File preparing product cannot be purchased until its real download file has been uploaded."],
    ],
  },
} as const;

type PageKey = keyof typeof pageContent;

export default function ShopInfo() {
  const [, shopMatch] = useRoute("/shop-info");
  const [, privacyMatch] = useRoute("/privacy");
  const [, refundMatch] = useRoute("/refunds");
  const [, termsMatch] = useRoute("/terms");
  const key: PageKey = shopMatch ? "shop" : privacyMatch ? "privacy" : refundMatch ? "refunds" : termsMatch ? "terms" : "faq";
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
