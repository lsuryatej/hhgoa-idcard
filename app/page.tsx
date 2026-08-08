import Generator from "@/components/Generator";

export default function Home() {
  return (
    <main className="shell">
      <header className="masthead">
        <h1 className="wordmark">FRAME IN GOA</h1>
        <p className="meta-line">Goa, India · 28–31 Oct 2026</p>
      </header>

      <Generator />

      <footer className="footer">
        <span>Hacker House Goa 2026 · #FrameInGoa</span>
        <span>
          <a href="https://hhgoa.com" target="_blank" rel="noreferrer">
            hhgoa.com
          </a>{" "}
          · 2:47 pm Studio
        </span>
      </footer>
    </main>
  );
}
