import Generator from "@/components/Generator";

export default function Home() {
  return (
    <main className="shell">
      <header className="masthead">
        <div className="wordmark-wrap">
          <h1 className="wordmark">FRAME IN GOA</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="wordmark-sticker"
            src="/brand/goa_hindi.svg"
            alt=""
            aria-hidden="true"
          />
        </div>
        <p className="meta-line">Goa, India · 28–31 Oct 2026</p>
      </header>

      <Generator />

      <footer className="footer">
        <span>Hacker House Goa 2026 · #FrameInGoa</span>
        <span className="footer-credit">
          <a href="https://hhgoa.com" target="_blank" rel="noreferrer">
            hhgoa.com
          </a>
          ·
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/studio-credit.svg" alt="2:47 pm Studio" />
        </span>
      </footer>
    </main>
  );
}
