"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadPhoto } from "@/lib/image";
import {
  DEFAULT_FOCUS,
  Focus,
  Format,
  PAPER,
  PINK,
  SIZES,
  YELLOW,
  canvasToBlob,
  loadBrand,
  loadFonts,
  render,
} from "@/lib/render";
import { builderClass } from "@/lib/titles";

type Member = {
  id: string;
  bitmap: ImageBitmap;
  preview: string;
  name: string;
  focus: Focus;
};

const FORMATS: { id: Format; label: string }[] = [
  { id: "pfp", label: "PFP Frame" },
  { id: "card", label: "ID Card" },
  { id: "crew", label: "Crew" },
];

const RINGS = [
  { id: YELLOW, label: "Yellow" },
  { id: PAPER, label: "Bone" },
  { id: PINK, label: "Pink" },
];

const ACCEPT = "image/*,.heic,.heif,.HEIC,.HEIF";

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "builder"
  );
}

export default function Generator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  const [ready, setReady] = useState(false);
  const [format, setFormat] = useState<Format>("card");
  const [name, setName] = useState("");
  const [stack, setStack] = useState("");
  const [teamName, setTeamName] = useState("");
  const [ringColor, setRingColor] = useState<string>(YELLOW);

  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const [focus, setFocus] = useState<Focus>(DEFAULT_FOCUS);
  const [members, setMembers] = useState<Member[]>([]);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const isCrew = format === "crew";
  const hasArt = isCrew ? members.length > 0 : photo !== null;

  useEffect(() => {
    Promise.all([loadFonts(), loadBrand()])
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  /* --------------------------------------------------------------- render */

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || !hasArt) return;
    const brand = await loadBrand();
    render(
      canvas,
      {
        format,
        photo: photo ?? undefined,
        focus,
        name,
        stack,
        ringColor,
        teamName,
        crew: members.map((m) => ({
          bitmap: m.bitmap,
          name: m.name,
          focus: m.focus,
        })),
      },
      brand
    );
  }, [ready, hasArt, format, photo, focus, name, stack, ringColor, teamName, members]);

  useEffect(() => {
    // A timer rather than requestAnimationFrame on purpose: rAF is suspended
    // while the tab is backgrounded, which would leave the preview stale for
    // anyone who switches away mid-edit and comes back.
    clearTimeout(frameRef.current);
    frameRef.current = window.setTimeout(() => {
      void draw();
    }, 16);
    return () => clearTimeout(frameRef.current);
  }, [draw]);

  /* ---------------------------------------------------------------- intake */

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.size > 0);
      if (!list.length) return;
      setError(null);
      setBusy("Reading photo");
      try {
        if (isCrew) {
          const loaded = await Promise.all(list.slice(0, 6).map(loadPhoto));
          setMembers((prev) =>
            [
              ...prev,
              ...loaded.map((p, i) => ({
                id: `${Date.now()}-${i}`,
                bitmap: p.bitmap,
                preview: "",
                name: "",
                focus: { ...DEFAULT_FOCUS },
              })),
            ].slice(0, 6)
          );
        } else {
          const p = await loadPhoto(list[0]);
          setPhoto(p.bitmap);
          setFocus({ ...DEFAULT_FOCUS });
        }
      } catch {
        setError(
          "That file would not open. Try a JPG or PNG, or re-save the HEIC from Photos."
        );
      } finally {
        setBusy(null);
      }
    },
    [isCrew]
  );

  // Thumbnails for the crew tray, drawn off the decoded bitmap so we never keep
  // the original File around.
  useEffect(() => {
    setMembers((prev) => {
      const missing = prev.filter((m) => !m.preview);
      if (!missing.length) return prev;
      const next = prev.map((m) => {
        if (m.preview) return m;
        const c = document.createElement("canvas");
        c.width = 160;
        c.height = 160;
        const cx = c.getContext("2d");
        if (cx) {
          const s = Math.max(160 / m.bitmap.width, 160 / m.bitmap.height);
          const dw = m.bitmap.width * s;
          const dh = m.bitmap.height * s;
          cx.drawImage(m.bitmap, (160 - dw) / 2, (160 - dh) / 2, dw, dh);
        }
        return { ...m, preview: c.toDataURL("image/jpeg", 0.7) };
      });
      return next;
    });
  }, [members.length]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) void ingest(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [ingest]);

  /* ------------------------------------------------------------ pan + zoom */

  const dragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(
    null
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isCrew || !photo) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, fx: focus.x, fy: focus.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    const canvas = canvasRef.current;
    if (!d || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    // One full drag across the preview sweeps the whole croppable overflow.
    const span = rect.width * 0.8;
    setFocus((f) => ({
      ...f,
      x: Math.min(1, Math.max(0, d.fx - (e.clientX - d.x) / span)),
      y: Math.min(1, Math.max(0, d.fy - (e.clientY - d.y) / span)),
    }));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  /* --------------------------------------------------------------- outputs */

  const filename = useMemo(() => {
    const who = isCrew ? teamName || "crew" : name || "builder";
    return `hh-goa-2026-${format}-${slug(who)}.png`;
  }, [format, isCrew, teamName, name]);

  const caption = useMemo(() => {
    if (isCrew) {
      const who = teamName.trim() || "our crew";
      return `${who} is locking in for Hacker House Goa 2026. 4 days, one rhythm, ocean at the door. Built our frames in one pass. #FrameInGoa`;
    }
    if (format === "pfp") {
      return `New profile picture, same plan: Hacker House Goa 2026. Less noise, more signal. Drop a photo in and the frame builds itself. #FrameInGoa`;
    }
    const cls = builderClass(name, stack);
    return `Builder pass secured for Hacker House Goa 2026. Class: ${cls}. 28-31 Oct, Goa. Make yours in about five seconds. #FrameInGoa`;
  }, [isCrew, format, teamName, name, stack]);

  const getBlob = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("nothing to export");
    await draw();
    return canvasToBlob(canvas);
  }, [draw]);

  const download = useCallback(
    (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    },
    [filename]
  );

  const handleDownload = async () => {
    setError(null);
    setBusy("Encoding");
    try {
      download(await getBlob());
    } catch {
      setError("Export failed. Reload and try once more.");
    } finally {
      setBusy(null);
    }
  };

  const openIntent = (url?: string) => {
    const params = new URLSearchParams({ text: caption });
    if (url) params.set("url", url);
    window.open(
      `https://x.com/intent/post?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShare = async () => {
    setError(null);
    setBusy("Preparing share");
    try {
      const blob = await getBlob();
      const file = new File([blob], filename, { type: "image/png" });

      // Phones get the real file handed straight to the X app: one tap, image
      // already attached, no download step in between.
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: caption });
          setBusy(null);
          return;
        } catch (err) {
          if ((err as Error)?.name === "AbortError") {
            setBusy(null);
            return;
          }
          // Fall through to the link route.
        }
      }

      // Desktop: upload, then post a link whose preview renders the graphic.
      setBusy("Uploading");
      let shareUrl: string | undefined;
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: {
            "content-type": "image/png",
            "x-format": format,
          },
          body: blob,
        });
        if (res.ok) {
          const data = (await res.json()) as { id?: string };
          if (data.id) shareUrl = `${window.location.origin}/s/${data.id}`;
        }
      } catch {
        // Storage not configured, or offline. The download below still works.
      }

      download(blob);
      openIntent(shareUrl);
      if (!shareUrl) {
        setError(
          "Posted without a link preview, so attach the downloaded PNG to your tweet."
        );
      }
    } catch {
      setError("Share failed. Download the image and post it manually.");
    } finally {
      setBusy(null);
    }
  };

  /* ------------------------------------------------------------------- ui */

  const ratio = SIZES[format];

  return (
    <div className="workbench">
      <div className="stage-col">
        <div className="stage">
          {hasArt ? (
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                cursor: isCrew || !photo ? "default" : "grab",
                touchAction: "none",
                aspectRatio: `${ratio.w} / ${ratio.h}`,
              }}
            />
          ) : (
            <div className="stage-empty">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/hanging-frames.svg" alt="" aria-hidden="true" />
              <p>Drop a photo to see your frame</p>
            </div>
          )}
          {busy && (
            <div className="stage-busy">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/goa_hindi.svg" alt="" aria-hidden="true" />
              <span>{busy}…</span>
            </div>
          )}
        </div>

        <div className="actions">
          <button
            className={`btn btn-primary${hasArt && !busy ? " btn-glow" : ""}`}
            onClick={handleDownload}
            disabled={!hasArt || !!busy}
          >
            Download PNG
          </button>
          <button
            className={`btn btn-x${hasArt && !busy ? " btn-glow" : ""}`}
            onClick={handleShare}
            disabled={!hasArt || !!busy}
          >
            Share to X
          </button>
        </div>

        {error && <p className="notice">{error}</p>}
        {!error && hasArt && !isCrew && photo && (
          <p className="notice">
            Drag the preview to reposition your face. Nothing is uploaded until
            you press Share.
          </p>
        )}
      </div>

      <div>
        <section className="panel">
          <h2 className="panel-head">
            <span className="num">1</span> Pick a format
          </h2>
          <div className="seg">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                aria-pressed={format === f.id}
                onClick={() => setFormat(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="hint">
            {format === "pfp"
              ? "A ring that survives X's circular crop. Swap it onto your profile as-is."
              : format === "card"
                ? "An event badge with your name, stack and a builder class we generate for you."
                : "Up to six people in one frame. Add a photo per teammate."}
          </p>
        </section>

        <section className="panel">
          <h2 className="panel-head">
            <span className="num">2</span> {isCrew ? "Add your crew" : "Add a photo"}
          </h2>

          <label
            className="drop"
            data-over={dragOver}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void ingest(e.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept={ACCEPT}
              multiple={isCrew}
              hidden
              onChange={(e) => {
                if (e.target.files) void ingest(e.target.files);
                e.target.value = "";
              }}
            />
            <strong>{isCrew ? "Choose photos" : "Choose a photo"}</strong>
            <span>Drag, drop or paste · JPG, PNG, HEIC from iPhone</span>
          </label>

          {isCrew && members.length > 0 && (
            <div className="crew-grid">
              {members.map((m, i) => (
                <div
                  key={m.id}
                  className="crew-cell"
                  style={
                    m.preview ? { backgroundImage: `url(${m.preview})` } : undefined
                  }
                >
                  <button
                    aria-label="Remove"
                    onClick={() =>
                      setMembers((prev) => prev.filter((x) => x.id !== m.id))
                    }
                  >
                    ×
                  </button>
                  <input
                    value={m.name}
                    placeholder={`NAME ${i + 1}`}
                    maxLength={14}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((x) =>
                          x.id === m.id ? { ...x, name: e.target.value } : x
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {!isCrew && photo && (
            <label className="field">
              <span>Zoom</span>
              <input
                type="range"
                min={1}
                max={2.6}
                step={0.02}
                value={focus.zoom}
                onChange={(e) =>
                  setFocus((f) => ({ ...f, zoom: Number(e.target.value) }))
                }
                style={{ padding: 0, border: 0, accentColor: PINK }}
              />
            </label>
          )}
        </section>

        <section className="panel">
          <h2 className="panel-head">
            <span className="num">3</span> Your details
          </h2>

          {format === "pfp" && (
            <>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Ring colour
              </span>
              <div className="seg">
                {RINGS.map((r) => (
                  <button
                    key={r.id}
                    aria-pressed={ringColor === r.id}
                    onClick={() => setRingColor(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="hint">
                The frame carries the branding, so there is nothing to fill in
                here. Download and set it as your profile picture.
              </p>
            </>
          )}

          {format === "card" && (
            <>
              <label className="field">
                <span>Name</span>
                <input
                  value={name}
                  maxLength={22}
                  placeholder="Surya Tej"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Stack or role</span>
                <input
                  value={stack}
                  maxLength={34}
                  placeholder="Rust · distributed systems"
                  onChange={(e) => setStack(e.target.value)}
                />
              </label>
              <p className="hint">
                Builder class:{" "}
                <strong>{builderClass(name, stack)}</strong> — derived from your
                name and stack, so it never changes on you.
              </p>
            </>
          )}

          {isCrew && (
            <>
              <label className="field">
                <span>Crew name</span>
                <input
                  value={teamName}
                  maxLength={20}
                  placeholder="Null Pointer Society"
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </label>
              <p className="hint">
                {members.length
                  ? `${members.length} of 6 added. Name each face in the tray above.`
                  : "Add between two and six photos."}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
