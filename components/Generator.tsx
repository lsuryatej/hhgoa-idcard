"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PhotoError, loadPhoto } from "@/lib/image";
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
import { logClient } from "@/lib/logger";

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

const DOMAINS = [
  "AI & AGENTS",
  "SYSTEMS & RUST",
  "WEB3 & CRYPTO",
  "DESIGN & UI",
  "FULLSTACK",
];

const STICKER_POSITIONS: { id: "bl" | "br" | "tl"; label: string }[] = [
  { id: "bl", label: "Bottom Left" },
  { id: "br", label: "Bottom Right" },
  { id: "tl", label: "Top Left" },
];

const ACCEPT = "image/*,.heic,.heif,.HEIC,.HEIF";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    // iPadOS 13+ identifies as "MacIntel" — touch points is what gives it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

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
  const [stickerPos, setStickerPos] = useState<"bl" | "br" | "tl">("bl");
  const [domainTag, setDomainTag] = useState<string>("AI & AGENTS");
  const [flash, setFlash] = useState(false);

  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const [focus, setFocus] = useState<Focus>(DEFAULT_FOCUS);
  const [members, setMembers] = useState<Member[]>([]);

  const triggerFlash = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
  }, []);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Read in an effect, not during render: navigator is unavailable during
  // SSR, and checking it inline would make the server-rendered HTML and the
  // client's first render disagree (a hydration mismatch).
  const [iosDownload, setIosDownload] = useState(false);
  useEffect(() => setIosDownload(isIOS()), []);

  // Desktop and mobile render genuinely different DOM structure (see the
  // return statement) rather than the same tree reordered with CSS: desktop
  // keeps the preview sticky beside every panel, mobile needs the preview to
  // sit between "add a photo" and "your details" so a zoom/rotate edit is
  // checkable without scrolling past three panels, with the actions moved to
  // the very end. That can't be expressed as one CSS reorder of the same
  // elements, so it's two branches. Defaults to the mobile branch during SSR
  // (no `window` there) to avoid a hydration mismatch; flips on mount.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 940px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const isCrew = format === "crew";
  const hasArt = isCrew ? members.length > 0 : photo !== null;

  useEffect(() => {
    // document.fonts.ready has no time bound and can hang indefinitely on
    // some mobile browsers/network conditions — the photo thumbnail (a
    // separate small canvas that doesn't wait on `ready`) would render fine
    // while the big canvas silently never painted anything, with no error.
    // A fallback timeout means the canvas always gets a first paint, even
    // with a fallback system font if the real one is still loading; the
    // font upgrades on the next redraw (rotate, zoom, any input change).
    let settled = false;
    const fallback = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setReady(true);
      }
    }, 3000);
    Promise.all([loadFonts(), loadBrand()])
      .catch(() => {})
      .finally(() => {
        if (!settled) {
          settled = true;
          clearTimeout(fallback);
        }
        setReady(true);
      });
    return () => clearTimeout(fallback);
  }, []);

  // Text fields survive an accidental reload or tab close — the photo itself
  // can't be persisted (bitmaps aren't serialisable), but retyping a name and
  // stack after losing the tab is the more annoying part to redo.
  useEffect(() => {
    return () => {
      setPhoto((prev) => {
        try { prev?.close(); } catch {}
        return null;
      });
      setMembers((prev) => {
        prev.forEach((m) => {
          try { m.bitmap.close(); } catch {}
        });
        return [];
      });
    };
  }, []);

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      logClient("GLOBAL_WINDOW_ERROR", {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error ? String(e.error.stack || e.error) : null,
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      logClient("GLOBAL_UNHANDLED_REJECTION", {
        reason: e.reason ? String(e.reason.stack || e.reason) : String(e.reason),
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hh-goa-frame-draft") ?? "{}");
      if (saved.name) setName(saved.name);
      if (saved.stack) setStack(saved.stack);
      if (saved.teamName) setTeamName(saved.teamName);
      if (saved.format) setFormat(saved.format);
    } catch {
      // Private browsing or storage disabled — fine, just starts blank.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "hh-goa-frame-draft",
        JSON.stringify({ name, stack, teamName, format })
      );
    } catch {
      // Storage full or disabled — nothing to persist, nothing to break.
    }
  }, [name, stack, teamName, format]);

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
        stickerPos,
        domainTag,
        crew: members.map((m) => ({
          bitmap: m.bitmap,
          name: m.name,
          focus: m.focus,
        })),
      },
      brand
    );
  }, [ready, hasArt, format, photo, focus, name, stack, ringColor, teamName, members, stickerPos, domainTag]);

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

  // Switching between the desktop and mobile branches below mounts a new
  // <canvas> node (different position in the tree), which loses whatever was
  // imperatively painted on the old one. Force a repaint whenever that
  // happens so the swap never leaves a blank canvas behind.
  useEffect(() => {
    void draw();
  }, [isDesktop, draw]);

  /* ---------------------------------------------------------------- intake */

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.size > 0);
      if (!list.length) return;
      setError(null);
      setBusy("Reading photo");
      try {
        if (isCrew) {
          const room = Math.max(0, 6 - members.length);
          const overflow = list.length > room;
          const loaded = await Promise.all(list.slice(0, room).map(loadPhoto));
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
          if (overflow) {
            setError(
              `Crew frames fit six people. Added ${room}, left the rest out — remove someone to add more.`
            );
          }
        } else {
          const p = await loadPhoto(list[0]);
          setPhoto((prev) => {
            if (prev && prev !== p.bitmap) {
              try { prev.close(); } catch {}
            }
            return p.bitmap;
          });
          setFocus({ ...DEFAULT_FOCUS });
        }
        triggerFlash();
      } catch (err) {
        setError(
          err instanceof PhotoError
            ? err.message
            : "That file would not open. Try a JPG, PNG, WEBP, or re-save the HEIC from Photos."
        );
      } finally {
        setBusy(null);
      }
    },
    [isCrew, members.length]
  );

  // A small confirmation thumbnail inside the "Add a photo" panel itself. On
  // a phone, the actual rendered frame sits below three panels of controls
  // (see .stage-col order in globals.css) — with nothing shown right here, a
  // successful upload looked identical to a silently failed one, since the
  // only feedback was scrolled off-screen.
  const [photoPreview, setPhotoPreview] = useState<string>("");
  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 160;
    const cx = c.getContext("2d");
    if (cx) {
      const s = Math.max(160 / photo.width, 160 / photo.height);
      const dw = photo.width * s;
      const dh = photo.height * s;
      cx.drawImage(photo, (160 - dw) / 2, (160 - dh) / 2, dw, dh);
      setPhotoPreview(c.toDataURL("image/jpeg", 0.7));
    }
  }, [photo]);

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

  // Three pre-written captions per format, plus room to write your own — the
  // export always carries whichever one is picked, right up to the moment
  // Share is pressed, so a name/stack edit after picking still updates the
  // preset text (only the custom box goes stale, which is expected).
  const captionPresets = useMemo(() => {
    if (isCrew) {
      const who = teamName.trim() || "our crew";
      return [
        `${who} is locking in for Hacker House Goa 2026. 4 days, one rhythm, ocean at the door. Built our frames in one pass. #FrameInGoa`,
        `${who}, assembled. Hacker House Goa 2026, 28-31 Oct. One frame, whole crew. #FrameInGoa`,
        `${who} is shipping to Goa. 4 days, one rhythm, no fluff. #FrameInGoa`,
      ];
    }
    if (format === "pfp") {
      return [
        `New profile picture, same plan: Hacker House Goa 2026. Less noise, more signal. Drop a photo in and the frame builds itself. #FrameInGoa`,
        `New PFP, same signal: Hacker House Goa 2026, 28-31 Oct. #FrameInGoa`,
        `Locked in for Hacker House Goa 2026. Frame did the work, photo did the rest. #FrameInGoa`,
      ];
    }
    const cls = builderClass(name, stack);
    return [
      `Builder pass secured for Hacker House Goa 2026. Class: ${cls}. 28-31 Oct, Goa. Make yours in about five seconds. #FrameInGoa`,
      `${cls}, reporting for Hacker House Goa 2026. 28-31 Oct. Yours in five seconds, no cropping required. #FrameInGoa`,
      `Pass printed. Class: ${cls}. Goa, 28-31 Oct. If you're building, you're welcome. #FrameInGoa`,
    ];
  }, [isCrew, format, teamName, name, stack]);

  const [captionIndex, setCaptionIndex] = useState(0);
  const [useCustomCaption, setUseCustomCaption] = useState(false);
  const [customCaption, setCustomCaption] = useState("");

  const caption = useCustomCaption
    ? customCaption.trim() || captionPresets[0]
    : (captionPresets[captionIndex] ?? captionPresets[0]);

  const getBlob = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("nothing to export");
    logClient("GET_BLOB_START", { format, hasArt, name, stack });
    try {
      await draw();
      logClient("DRAW_COMPLETE", { format });
      const blob = await canvasToBlob(canvas);
      logClient("BLOB_CREATED", { size: blob.size, type: blob.type });
      return blob;
    } catch (err) {
      logClient("GET_BLOB_ERROR", err);
      throw err;
    }
  }, [draw, format, hasArt, name, stack]);

  const download = useCallback(
    (blob: Blob) => {
      logClient("DOWNLOAD_BLOB_CALL", { size: blob.size, filename });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    },
    [filename]
  );

  const handleDownload = async () => {
    logClient("CLICK_DOWNLOAD_PNG", { format, isIOS: isIOS(), name, stack });
    setError(null);
    setBusy("Encoding");
    triggerFlash();
    try {
      const blob = await getBlob();

      if (isIOS()) {
        const nav = navigator as Navigator & {
          canShare?: (d: ShareData) => boolean;
        };
        const file = new File([blob], filename, { type: "image/png" });
        const canShareFiles = Boolean(nav.canShare?.({ files: [file] }));
        logClient("IOS_SHARE_CHECK", { canShareFiles });
        if (canShareFiles) {
          try {
            await nav.share({ files: [file] });
            logClient("IOS_NAV_SHARE_SUCCESS", {});
            return;
          } catch (err) {
            logClient("IOS_NAV_SHARE_ERROR", err);
            if ((err as Error)?.name === "AbortError") return;
            download(blob);
            setError(
              "The share sheet didn't finish, so this tried a direct download instead — check your Downloads/Files app."
            );
            return;
          }
        }
        download(blob);
        setError(
          "This iPhone/browser can't share files directly, so this tried a direct download instead — check your Downloads/Files app."
        );
        return;
      }

      download(blob);
    } catch (err) {
      logClient("HANDLE_DOWNLOAD_ERROR", err);
      setError("Export failed. Reload and try once more.");
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    logClient("CLICK_COPY_IMAGE", { format, name, stack });
    setError(null);
    setBusy("Copying");
    triggerFlash();
    try {
      const blob = await getBlob();
      if (typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        logClient("CLIPBOARD_COPY_SUCCESS", {});
        setError("✨ Image copied to clipboard! Press Cmd+V / Ctrl+V to paste.");
      } else {
        download(blob);
        setError("Clipboard copy isn't supported in this browser, downloaded instead.");
      }
    } catch (err) {
      logClient("CLIPBOARD_COPY_ERROR", err);
      setError("Could not copy image automatically. Downloaded instead.");
    } finally {
      setBusy(null);
    }
  };

  const intentUrl = (url?: string) => {
    const params = new URLSearchParams({ text: caption });
    if (url) params.set("url", url);
    return `https://x.com/intent/post?${params.toString()}`;
  };

  const handleShare = async () => {
    logClient("CLICK_SHARE_TO_X", { format, isIOS: isIOS(), caption });
    setError(null);
    setBusy("Preparing share");
    triggerFlash();

    let tab: Window | null = null;
    try {
      tab = window.open(intentUrl(), "_blank");
      logClient("WINDOW_OPEN_X_INTENT", { opened: Boolean(tab) });
    } catch (err) {
      logClient("WINDOW_OPEN_ERROR", err);
      tab = null;
    }

    try {
      const blob = await getBlob();
      const file = new File([blob], filename, { type: "image/png" });

      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        try {
          logClient("MOBILE_SHARE_ATTEMPT", {});
          await nav.share({ files: [file], text: caption });
          logClient("MOBILE_SHARE_SUCCESS", {});
          tab?.close();
          setBusy(null);
          return;
        } catch (err) {
          logClient("MOBILE_SHARE_ERROR", err);
        }
      }

      setBusy("Uploading");
      let shareUrl: string | undefined;
      try {
        logClient("API_SHARE_POST_START", {});
        const res = await fetch("/api/share", {
          method: "POST",
          headers: {
            "content-type": "image/png",
            "x-format": format,
          },
          body: blob,
        });
        logClient("API_SHARE_RESPONSE", { status: res.status, ok: res.ok });
        if (res.ok) {
          const data = (await res.json()) as { id?: string };
          if (data.id) shareUrl = `${window.location.origin}/s/${data.id}`;
        }
      } catch (err) {
        logClient("API_SHARE_FETCH_ERROR", err);
      }

      download(blob);
      const url = intentUrl(shareUrl);
      if (tab) {
        tab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      if (!shareUrl) {
        setError(
          "Posted without a link preview, so attach the downloaded PNG to your tweet."
        );
      }
    } catch (err) {
      logClient("HANDLE_SHARE_ERROR", err);
      tab?.close();
      setError("Share failed. Download the image and post it manually.");
    } finally {
      setBusy(null);
    }
  };

  /* ------------------------------------------------------------------- ui */

  const ratio = SIZES[format];

  const stageBlock = (
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
      {flash && <div className="stage-flash" />}
    </div>
  );

  const actionsBlock = (
    <>
      <div className="actions">
        <button
          className={`btn btn-primary${hasArt && !busy ? " btn-glow" : ""}`}
          onClick={handleDownload}
          disabled={!hasArt || !!busy}
        >
          Download PNG
        </button>
        <button
          className={`btn${hasArt && !busy ? " btn-glow" : ""}`}
          onClick={handleCopy}
          disabled={!hasArt || !!busy}
        >
          Copy Image
        </button>
        <button
          className={`btn btn-x${hasArt && !busy ? " btn-glow" : ""}`}
          onClick={handleShare}
          disabled={!hasArt || !!busy}
        >
          Share to X
        </button>
      </div>

      {error && <p className="notice notice-error">{error}</p>}
      {!error && hasArt && iosDownload && (
        <p className="notice">
          Download opens the share sheet on iPhone — pick{" "}
          <strong>Save Image</strong> to send it to Photos.
        </p>
      )}
      {!error && hasArt && (
        <p className="notice">
          Opens x.com — sign in there first if you&apos;re not already.
        </p>
      )}
      {!error && hasArt && !isCrew && photo && (
        <p className="notice">
          Drag the preview to reposition your face. Nothing is uploaded until
          you press Share.
        </p>
      )}
    </>
  );

  const panelFormat = (
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
  );

  const panelPhoto = (
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
        {!isCrew && photoPreview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="drop-thumb" src={photoPreview} alt="" />
            <strong>Photo added — tap to change</strong>
            <span>Or drag a new one to replace it</span>
          </>
        ) : (
          <>
            <strong>{isCrew ? "Choose photos" : "Choose a photo"}</strong>
            <span>Drag, drop or paste · JPG, PNG, WEBP, HEIC/HEIF from iPhone</span>
          </>
        )}
      </label>

      {!isCrew && photo && (
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setPhoto((prev) => {
              try { prev?.close(); } catch {}
              return null;
            });
            setFocus({ ...DEFAULT_FOCUS });
          }}
        >
          Remove photo
        </button>
      )}

      {isCrew && members.length > 0 && (
        <div className="crew-grid">
          {members.map((m, i) => (
            <div
              key={m.id}
              className="crew-cell"
              style={m.preview ? { backgroundImage: `url(${m.preview})` } : undefined}
            >
              <button
                aria-label="Rotate"
                className="crew-rotate"
                onClick={() =>
                  setMembers((prev) =>
                    prev.map((x) =>
                      x.id === m.id
                        ? {
                            ...x,
                            focus: {
                              ...x.focus,
                              rotation: (x.focus.rotation + 90) % 360,
                            },
                          }
                        : x
                    )
                  )
                }
              >
                ⟳
              </button>
              <button
                aria-label="Remove"
                onClick={() =>
                  setMembers((prev) => {
                    const target = prev.find((x) => x.id === m.id);
                    if (target?.bitmap) {
                      try { target.bitmap.close(); } catch {}
                    }
                    return prev.filter((x) => x.id !== m.id);
                  })
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
          <span>Zoom &amp; rotate</span>
          <div className="zoom-row">
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
            <button
              type="button"
              className="icon-btn"
              aria-label="Rotate 90 degrees"
              onClick={() =>
                setFocus((f) => ({ ...f, rotation: (f.rotation + 90) % 360 }))
              }
            >
              ⟳
            </button>
          </div>
        </label>
      )}
    </section>
  );

  const panelDetails = (
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
            The frame carries the branding, so there is nothing to fill in here.
            Download and set it as your profile picture.
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
              placeholder="0xBuilder"
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
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 700,
              display: "block",
              marginTop: 14,
              marginBottom: 6,
            }}
          >
            Domain specialty
          </span>
          <div className="seg" style={{ flexWrap: "wrap" }}>
            {DOMAINS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={domainTag === d}
                onClick={() => setDomainTag(d)}
                style={{ fontSize: 11, padding: "6px 10px" }}
              >
                {d}
              </button>
            ))}
          </div>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 700,
              display: "block",
              marginTop: 14,
              marginBottom: 6,
            }}
          >
            Sticker position
          </span>
          <div className="seg">
            {STICKER_POSITIONS.map((sp) => (
              <button
                key={sp.id}
                type="button"
                aria-pressed={stickerPos === sp.id}
                onClick={() => setStickerPos(sp.id)}
              >
                {sp.label}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            Builder class: <strong>{builderClass(name, stack)}</strong> — derived
            from your name and stack, so it never changes on you.
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
  );

  const panelCaption = (
    <section className="panel">
      <h2 className="panel-head">
        <span className="num">4</span> Caption
      </h2>
      <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
        Goes out with the {isCrew ? "crew" : format === "pfp" ? "PFP" : "card"}{" "}
        image when you press Share.
      </p>
      <div className="caption-list">
        {captionPresets.map((c, i) => (
          <label
            key={i}
            className="caption-option"
            data-active={!useCustomCaption && captionIndex === i}
          >
            <input
              type="radio"
              name="caption"
              checked={!useCustomCaption && captionIndex === i}
              onChange={() => {
                setCaptionIndex(i);
                setUseCustomCaption(false);
              }}
            />
            <span>{c}</span>
          </label>
        ))}
        <label className="caption-option" data-active={useCustomCaption}>
          <input
            type="radio"
            name="caption"
            checked={useCustomCaption}
            onChange={() => setUseCustomCaption(true)}
          />
          <span>
            Write your own
            {useCustomCaption && (
              <textarea
                className="caption-custom"
                value={customCaption}
                maxLength={260}
                placeholder="Type your own caption — #FrameInGoa still helps you get spotted."
                onChange={(e) => setCustomCaption(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </span>
        </label>
      </div>
    </section>
  );

  // Desktop: preview + actions stick together in a left column beside every
  // panel, so they're always in view regardless of scroll — the layout
  // already solves "see the edit next to the controls" here.
  if (isDesktop) {
    return (
      <div className="workbench">
        <div className="stage-col">
          {stageBlock}
          {actionsBlock}
        </div>
        <div>
          {panelFormat}
          {panelPhoto}
          {panelDetails}
          {panelCaption}
        </div>
      </div>
    );
  }

  // Mobile: one column, so the preview goes right after the controls that
  // affect it (format + photo/zoom/rotate) instead of at either extreme —
  // no scrolling required to check a zoom or rotate edit. Actions move to
  // the very end, after every field that can change what gets shared.
  return (
    <div className="workbench workbench-mobile">
      {panelFormat}
      {panelPhoto}
      {stageBlock}
      {panelDetails}
      {panelCaption}
      {actionsBlock}
    </div>
  );
}
