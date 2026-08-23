import { StoreHeader } from "@/components/StoreHeader";
import { trpc } from "@/lib/trpc";
import { downloadCountLabel, formatDownloadFileType } from "@/lib/downloadPresentation";
import { CheckCircle2, Download, FileCheck2, KeyRound, MailCheck, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useRoute } from "wouter";

export default function Downloads() {
  const [, params] = useRoute("/downloads/:receiptToken");
  const receiptToken = params?.receiptToken ?? "";
  const { data, isLoading, error } = trpc.storefront.downloads.byReceipt.useQuery(
    { receiptToken },
    { enabled: Boolean(receiptToken) },
  );
  const resolve = trpc.storefront.downloads.resolve.useMutation();
  const [downloadingToken, setDownloadingToken] = useState<string | null>(null);
  const [downloadedToken, setDownloadedToken] = useState<string | null>(null);

  const startDownload = async (token: string) => {
    setDownloadingToken(token);
    try {
      const result = await resolve.mutateAsync({ token });
      setDownloadedToken(token);
      window.location.assign(result.url);
    } finally {
      setDownloadingToken(null);
    }
  };

  const fileCount = data?.length ?? 0;

  return (
    <div className="marketplace-page downloads-page">
      <StoreHeader />
      <main className="downloads-shell container">
        <section className="downloads-hero" aria-labelledby="downloads-title">
          <div className="downloads-hero__glow" aria-hidden="true" />
          <div className="downloads-hero__content">
            <span className="downloads-success-badge"><CheckCircle2 size={16} /> Order confirmed</span>
            <p className="eyebrow">Your private download library</p>
            <h1 id="downloads-title">Your files are ready when you are.</h1>
            <p>Thank you for your purchase. This page is private to your order, and the same secure link has been sent to your receipt email.</p>
          </div>
          <aside className="downloads-hero__summary" aria-label="Order delivery summary">
            <span className="downloads-summary__icon"><Sparkles size={20} /></span>
            <strong>{isLoading ? "Preparing your library" : downloadCountLabel(fileCount)}</strong>
            <span>Available now from your protected receipt.</span>
          </aside>
        </section>

        {isLoading ? (
          <section className="downloads-library downloads-library--loading" aria-live="polite">
            <div className="downloads-library__head"><div><span className="eyebrow">Secure access</span><h2>Preparing your file library</h2></div></div>
            <div className="download-card download-card--skeleton"><span /><span /><span /></div>
          </section>
        ) : null}

        {error ? (
          <section className="downloads-library downloads-library--missing">
            <span className="downloads-empty__icon"><KeyRound size={26} /></span>
            <div>
              <span className="eyebrow">Private link not found</span>
              <h2>We could not open this download library.</h2>
              <p>Please use the original delivery email sent after payment, or contact Ehode if you need help with your order.</p>
            </div>
          </section>
        ) : null}

        {!isLoading && !error ? (
          <section className="downloads-library" aria-labelledby="file-library-title">
            <div className="downloads-library__head">
              <div>
                <span className="eyebrow">Secure access</span>
                <h2 id="file-library-title">Your download library</h2>
                <p>Choose a file below. Each button starts an attachment download directly to your device.</p>
              </div>
              <span className="downloads-count-pill"><ShieldCheck size={15} /> {downloadCountLabel(fileCount)}</span>
            </div>

            <div className="download-list" aria-live="polite">
              {data?.map((file, index) => {
                const isDownloading = downloadingToken === file.token;
                const wasDownloaded = downloadedToken === file.token;
                return (
                  <article className="download-card" key={file.token}>
                    <div className="download-card__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
                    <span className="download-card__file-icon"><FileCheck2 size={24} /></span>
                    <div className="download-card__details">
                      <span className="download-card__type">{formatDownloadFileType(file.filename)}</span>
                      <strong>{file.title}</strong>
                      <small title={file.filename}>{file.filename}</small>
                    </div>
                    <button
                      className="download-card__action"
                      type="button"
                      disabled={isDownloading || resolve.isPending}
                      onClick={() => void startDownload(file.token)}
                    >
                      {wasDownloaded ? <CheckCircle2 size={18} /> : <Download size={18} />}
                      <span>{isDownloading ? "Preparing…" : wasDownloaded ? "Downloaded" : "Download file"}</span>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {!isLoading && !error ? (
          <section className="downloads-reassurance" aria-label="Download access notes">
            <article><MailCheck size={21} /><div><strong>Check your inbox</strong><span>Your private library link was sent with your payment receipt.</span></div></article>
            <article><ShieldCheck size={21} /><div><strong>Protected access</strong><span>Your files are linked to this confirmed order, not a public page.</span></div></article>
            <article><KeyRound size={21} /><div><strong>Keep this link handy</strong><span>Return here whenever you need to download your files again.</span></div></article>
          </section>
        ) : null}
      </main>
    </div>
  );
}
