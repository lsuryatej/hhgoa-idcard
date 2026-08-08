import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveShare } from "@/lib/blob";

export const runtime = "nodejs";

const TITLE = "Frame in Goa — Hacker House Goa 2026";
const DESC =
  "Made with the HH Goa 2026 frame generator. Drop in a photo, get yours in seconds. #FrameInGoa";

// The colocated opengraph-image route is picked up automatically, so we
// deliberately do not set openGraph.images here — doing so would override it.
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const url = await resolveShare(id);
  if (!url) notFound();

  return (
    <main className="share-wrap">
      <div className="wordmark-wrap">
        <h1 className="wordmark" style={{ fontSize: "clamp(34px,11vw,66px)" }}>
          FRAME IN GOA
        </h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="wordmark-sticker"
          src="/brand/goa_hindi.svg"
          alt=""
          aria-hidden="true"
        />
      </div>
      <p className="meta-line" style={{ marginBottom: 26 }}>
        Goa, India · 28–31 Oct 2026
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="share-art" src={url} alt="HH Goa 2026 frame" />

      <div className="actions" style={{ marginTop: 26 }}>
        <a className="btn btn-primary" href="/">
          Make yours
        </a>
        <a className="btn btn-x" href={url} download>
          Download this
        </a>
      </div>

      <p className="notice">
        Built for the HH Goa 2026 shortlisting task. #FrameInGoa
      </p>
      <p className="notice footer-credit" style={{ justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/studio-credit.svg" alt="2:47 pm Studio" />
      </p>
    </main>
  );
}
