import { builderClass, passNumber } from "./titles";
import { loadImageElement } from "./image";

export const GREEN = "#0b6839";
export const GREEN_DEEP = "#074f2b";
export const YELLOW = "#fee101";
export const YELLOW_DIM = "#edd723";
export const PAPER = "#fffbe8";
export const PINK = "#ff0080";
export const INK = "#000000";

export const DISPLAY = "Imbue";
export const MONO = "'Victor Mono', ui-monospace, monospace";

export type Format = "pfp" | "card" | "crew";

export type Focus = { x: number; y: number; zoom: number };
export const DEFAULT_FOCUS: Focus = { x: 0.5, y: 0.5, zoom: 1 };

export type CrewMember = { bitmap: ImageBitmap; name: string; focus: Focus };

export type RenderInput = {
  format: Format;
  photo?: ImageBitmap;
  focus: Focus;
  name: string;
  stack: string;
  ringColor: string;
  crew: CrewMember[];
  teamName: string;
};

export const SIZES: Record<Format, { w: number; h: number }> = {
  pfp: { w: 1024, h: 1024 },
  card: { w: 1080, h: 1350 },
  crew: { w: 1080, h: 1350 },
};

/* ------------------------------------------------------------------ assets */

type Brand = { goa: HTMLImageElement; tape: HTMLImageElement };
let brandPromise: Promise<Brand> | null = null;

export function loadBrand(): Promise<Brand> {
  if (!brandPromise) {
    brandPromise = Promise.all([
      loadImageElement("/brand/goa_hindi.svg"),
      loadImageElement("/brand/tape.svg"),
    ]).then(([goa, tape]) => ({ goa, tape }));
  }
  return brandPromise;
}

let fontsPromise: Promise<void> | null = null;

export function loadFonts(): Promise<void> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      // font-display:block means the faces exist but aren't rasterised until
      // something asks for them. Canvas silently falls back to Times if we skip
      // this, so ask explicitly for every weight the renderers use.
      await Promise.all([
        document.fonts.load(`700 120px ${DISPLAY}`),
        document.fonts.load(`400 120px ${DISPLAY}`),
        document.fonts.load(`700 40px ${MONO}`),
        document.fonts.load(`400 40px ${MONO}`),
      ]);
      await document.fonts.ready;
    })();
  }
  return fontsPromise;
}

/* ----------------------------------------------------------------- helpers */

// The goa_hindi.svg artboard is 181x180 but the mark only occupies the top-left
// corner of it. These are the measured content bounds.
const GOA_CROP = { x: 0, y: 0, w: 110, h: 112 };

function drawGoaMark(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  height: number,
  rotationDeg: number
) {
  const ratio = GOA_CROP.w / GOA_CROP.h;
  const h = height;
  const w = h * ratio;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(
    img,
    GOA_CROP.x,
    GOA_CROP.y,
    GOA_CROP.w,
    GOA_CROP.h,
    -w / 2,
    -h / 2,
    w,
    h
  );
  ctx.restore();
}

function drawTape(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  scale: number
) {
  const pattern = ctx.createPattern(img, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width / scale, img.naturalHeight || 7);
  ctx.restore();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  bmp: ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number,
  focus: Focus
) {
  // Cover-fit, then let the focus point decide which part of the overflow gets
  // cropped. This is what makes landscape shots and off-centre selfies work
  // without asking anyone to pre-crop.
  const base = Math.max(w / bmp.width, h / bmp.height);
  const scale = base * focus.zoom;
  const dw = bmp.width * scale;
  const dh = bmp.height * scale;
  const dx = x + (w - dw) * focus.x;
  const dy = y + (h - dh) * focus.y;
  ctx.drawImage(bmp, dx, dy, dw, dh);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Fills text, preceded by a hard offset copy in `shadow`. No blur, ever. */
function hardText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { fill: string; shadow?: string; dx?: number; dy?: number }
) {
  if (opts.shadow) {
    ctx.fillStyle = opts.shadow;
    ctx.fillText(text, x + (opts.dx ?? 6), y + (opts.dy ?? 6));
  }
  ctx.fillStyle = opts.fill;
  ctx.fillText(text, x, y);
}

/** Shrinks `size` until `text` fits `maxWidth`. Returns the size actually used. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  build: (s: number) => string,
  min = 12
): number {
  let s = size;
  ctx.font = build(s);
  while (ctx.measureText(text).width > maxWidth && s > min) {
    s -= Math.max(1, Math.round(s * 0.04));
    ctx.font = build(s);
  }
  return s;
}

function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  r: number,
  centerAngle: number,
  flip: boolean,
  tracking: number
) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + tracking);
  const span = widths.reduce((a, b) => a + b, 0) / r;
  const dir = flip ? -1 : 1;
  let angle = centerAngle - (dir * span) / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < chars.length; i++) {
    const step = widths[i] / r;
    const mid = angle + (dir * step) / 2;
    ctx.save();
    ctx.translate(cx + r * Math.cos(mid), cy + r * Math.sin(mid));
    ctx.rotate(mid + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    angle += dir * step;
  }
  ctx.restore();
}

function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: "left" | "center" | "right" = "left"
) {
  const chars = [...text];
  const total =
    chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) +
    tracking * Math.max(0, chars.length - 1);
  let cursor = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const c of chars) {
    ctx.fillText(c, cursor, y);
    cursor += ctx.measureText(c).width + tracking;
  }
  ctx.textAlign = prev;
  return total;
}

/** Sunrise rays fanning out from a point. The site's whole hero is a sunrise. */
function sunRays(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  count: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.translate(cx, cy);
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a = i * step;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - step * 0.24) * radius, Math.sin(a - step * 0.24) * radius);
    ctx.lineTo(Math.cos(a + step * 0.24) * radius, Math.sin(a + step * 0.24) * radius);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const density = Math.floor((w * h) / 900);
  ctx.save();
  for (let i = 0; i < density; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle =
      Math.random() > 0.5
        ? `rgba(255,255,255,${amount})`
        : `rgba(0,0,0,${amount})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

function barcode(
  ctx: CanvasRenderingContext2D,
  seed: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  ctx.save();
  ctx.fillStyle = INK;
  let cursor = x;
  while (cursor < x + w) {
    n = (n * 1103515245 + 12345) >>> 0;
    const bar = 2 + (n % 5);
    const gap = 2 + ((n >> 8) % 4);
    if (cursor + bar > x + w) break;
    ctx.fillRect(cursor, y, bar, h);
    cursor += bar + gap;
  }
  ctx.restore();
}

const DATELINE = "GOA, INDIA · 28–31 OCT 2026";

/* -------------------------------------------------------------- format: pfp */

function renderPfp(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  brand: Brand
) {
  const S = 1024;
  const cx = S / 2;
  const cy = S / 2;

  const RIM = 10;
  const BAND = 96;
  const rOuter = S / 2;
  const rBandOut = rOuter - RIM;
  const rBandIn = rBandOut - BAND;
  const rPhoto = rBandIn - RIM;

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, S, S);
  sunRays(ctx, cx, cy, S, 24, YELLOW, 0.07);

  // Photo, clipped to the inner circle.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rPhoto, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = GREEN_DEEP;
  ctx.fillRect(0, 0, S, S);
  if (input.photo) {
    drawCover(ctx, input.photo, cx - rPhoto, cy - rPhoto, rPhoto * 2, rPhoto * 2, input.focus);
  }
  ctx.restore();

  // Ring band.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rBandOut, 0, Math.PI * 2);
  ctx.arc(cx, cy, rBandIn, 0, Math.PI * 2, true);
  ctx.fillStyle = input.ringColor;
  ctx.fill("evenodd");
  ctx.restore();

  // Hard rims either side of the band.
  ctx.strokeStyle = INK;
  ctx.lineWidth = RIM;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter - RIM / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, rBandIn - RIM / 2, 0, Math.PI * 2);
  ctx.stroke();

  const onLight = input.ringColor !== PINK;
  const bandInk = onLight ? INK : PAPER;
  const rText = (rBandOut + rBandIn) / 2;

  ctx.fillStyle = bandInk;
  ctx.font = `700 46px ${DISPLAY}`;
  arcText(ctx, "HACKER HOUSE", cx, cy, rText + 4, -Math.PI / 2, false, 14);

  ctx.font = `700 26px ${MONO}`;
  arcText(ctx, DATELINE, cx, cy, rText, Math.PI / 2, true, 5);

  // Pink markers at the 3 and 9 o'clock seams between the two texts.
  for (const a of [0, Math.PI]) {
    const mx = cx + Math.cos(a) * rText;
    const my = cy + Math.sin(a) * rText;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = input.ringColor === PINK ? YELLOW : PINK;
    ctx.fillRect(-15, -15, 30, 30);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(-15, -15, 30, 30);
    ctx.restore();
  }

  // गोवा sticker sits fully inside the photo circle. X crops avatars to the
  // inscribed circle, so anything past `rPhoto` on the diagonal would be lost.
  drawGoaMark(ctx, brand.goa, cx + 215, cy + 225, 132, -14);

  grain(ctx, S, S, 0.05);
}

/* ---------------------------------------------------------- shared: shell */

type Shell = {
  padX: number;
  paperX: number;
  paperY: number;
  paperW: number;
  paperH: number;
  innerX: number;
  innerW: number;
};

function drawShell(
  ctx: CanvasRenderingContext2D,
  brand: Brand,
  w: number,
  h: number
): Shell {
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, w, h);

  const paperX = 62;
  const paperY = 104;
  const paperW = w - paperX * 2;
  const paperH = h - paperY - 96;

  sunRays(ctx, w / 2, paperY + paperH * 0.42, h, 28, YELLOW, 0.085);

  drawTape(ctx, brand.tape, 0, 26, w, 3.4);
  drawTape(ctx, brand.tape, 0, h - 48, w, 3.4);

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(paperX + 16, paperY + 18, paperW, paperH);
  ctx.fillStyle = PAPER;
  ctx.fillRect(paperX, paperY, paperW, paperH);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(paperX + 3, paperY + 3, paperW - 6, paperH - 6);

  const innerX = paperX + 46;
  const innerW = paperW - 92;

  // Lanyard slot: this is the detail that makes it read as a badge.
  const slotW = 168;
  const slotH = 30;
  const slotX = w / 2 - slotW / 2;
  const slotY = paperY + 34;
  ctx.fillStyle = GREEN;
  roundRect(ctx, slotX, slotY, slotW, slotH, slotH / 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  roundRect(ctx, slotX, slotY, slotW, slotH, slotH / 2);
  ctx.stroke();

  return { padX: paperX, paperX, paperY, paperW, paperH, innerX, innerW };
}

function drawMasthead(
  ctx: CanvasRenderingContext2D,
  shell: Shell,
  w: number,
  y: number
): number {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const size = fitFont(
    ctx,
    "HACKER HOUSE",
    shell.innerW,
    148,
    (s) => `700 ${s}px ${DISPLAY}`
  );
  hardText(ctx, "HACKER HOUSE", w / 2, y, {
    fill: YELLOW,
    shadow: INK,
    dx: 7,
    dy: 7,
  });

  const ruleY = y + 26;
  ctx.fillStyle = PINK;
  ctx.fillRect(shell.innerX, ruleY, shell.innerW, 5);

  ctx.font = `700 25px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.textBaseline = "top";
  tracked(ctx, DATELINE, w / 2, ruleY + 20, 6, "center");
  ctx.textBaseline = "alphabetic";
  return size;
}

function drawFootline(
  ctx: CanvasRenderingContext2D,
  shell: Shell,
  w: number,
  seed: string,
  leftLabel: string
) {
  const baseY = shell.paperY + shell.paperH - 104;

  ctx.fillStyle = INK;
  ctx.fillRect(shell.innerX, baseY - 26, shell.innerW, 4);

  barcode(ctx, seed, shell.innerX, baseY, 240, 44);

  ctx.font = `700 22px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  tracked(ctx, leftLabel, shell.innerX, baseY + 54, 4, "left");

  ctx.textAlign = "right";
  ctx.fillStyle = PINK;
  ctx.font = `700 26px ${MONO}`;
  ctx.textBaseline = "top";
  tracked(ctx, "#FRAMEINGOA", shell.innerX + shell.innerW, baseY + 8, 3, "right");

  ctx.fillStyle = INK;
  ctx.font = `700 22px ${MONO}`;
  tracked(ctx, "2:47 PM STUDIO", shell.innerX + shell.innerW, baseY + 54, 4, "right");

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/* ------------------------------------------------------------- format: card */

function renderCard(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  brand: Brand
) {
  const { w, h } = SIZES.card;
  const shell = drawShell(ctx, brand, w, h);

  drawMasthead(ctx, shell, w, shell.paperY + 218);

  // Portrait. Everything below is positioned off this box, and the sizes are
  // tuned so the class band clears the footline on the tallest name.
  const photoSize = 450;
  const photoX = w / 2 - photoSize / 2;
  const photoY = shell.paperY + 300;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(photoX + 12, photoY + 14, photoSize, photoSize);
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, photoY, photoSize, photoSize);
  ctx.clip();
  ctx.fillStyle = GREEN_DEEP;
  ctx.fillRect(photoX, photoY, photoSize, photoSize);
  if (input.photo) {
    drawCover(ctx, input.photo, photoX, photoY, photoSize, photoSize, input.focus);
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(photoX + 3, photoY + 3, photoSize - 6, photoSize - 6);

  // Sticker on the photo's bottom-left corner: it fills the dead paper beside
  // the window without landing on the face, which sits high in most portraits.
  drawGoaMark(ctx, brand.goa, photoX + 4, photoY + photoSize - 72, 138, -14);

  // Name.
  const name = (input.name.trim() || "YOUR NAME").toUpperCase();
  ctx.textAlign = "center";
  fitFont(ctx, name, shell.innerW, 104, (s) => `700 ${s}px ${DISPLAY}`);
  ctx.fillStyle = INK;
  ctx.fillText(name, w / 2, photoY + photoSize + 108);

  // Stack / role.
  const stack = (input.stack.trim() || "BUILDER").toUpperCase();
  const stackSize = fitFont(ctx, stack, shell.innerW, 28, (s) => `700 ${s}px ${MONO}`);
  ctx.font = `700 ${stackSize}px ${MONO}`;
  ctx.fillStyle = PINK;
  ctx.textBaseline = "top";
  tracked(ctx, stack, w / 2, photoY + photoSize + 124, 5, "center");
  ctx.textBaseline = "alphabetic";

  // Builder class band.
  const cls = builderClass(input.name, input.stack);
  const bandY = photoY + photoSize + 168;
  const bandH = 88;
  ctx.fillStyle = INK;
  ctx.fillRect(shell.innerX + 8, bandY + 9, shell.innerW, bandH);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(shell.innerX, bandY, shell.innerW, bandH);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(shell.innerX, bandY, shell.innerW, bandH);

  ctx.font = `700 16px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.textBaseline = "top";
  tracked(ctx, "BUILDER CLASS", shell.innerX + 18, bandY + 12, 5, "left");

  const clsSize = fitFont(ctx, cls, shell.innerW - 40, 52, (s) => `700 ${s}px ${DISPLAY}`);
  ctx.font = `700 ${clsSize}px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(cls, w / 2, bandY + bandH - 20);

  drawFootline(
    ctx,
    shell,
    w,
    `${input.name}${input.stack}`,
    `PASS NO. ${passNumber(input.name, input.stack)}`
  );

  grain(ctx, w, h, 0.045);
}

/* ------------------------------------------------------------- format: crew */

function renderCrew(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  brand: Brand
) {
  const { w, h } = SIZES.crew;
  const shell = drawShell(ctx, brand, w, h);
  drawMasthead(ctx, shell, w, shell.paperY + 218);

  const members = input.crew.slice(0, 6);
  const n = Math.max(members.length, 1);
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);

  const gridTop = shell.paperY + 310;
  const gridBottom = shell.paperY + shell.paperH - 250;
  const gridH = gridBottom - gridTop;

  const cellW = shell.innerW / cols;
  const cellH = gridH / rows;
  const avatar = Math.min(cellW - 34, cellH - 96);

  ctx.textAlign = "center";
  members.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Centre the last row when it is short, so a 5-up doesn't look broken.
    const inRow = Math.min(cols, n - row * cols);
    const rowOffset = ((cols - inRow) * cellW) / 2;
    const ccx = shell.innerX + rowOffset + col * cellW + cellW / 2;
    const ccy = gridTop + row * cellH + avatar / 2 + 10;
    const r = avatar / 2;

    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.arc(ccx + 9, ccy + 11, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = GREEN_DEEP;
    ctx.fillRect(ccx - r, ccy - r, r * 2, r * 2);
    drawCover(ctx, m.bitmap, ccx - r, ccy - r, r * 2, r * 2, m.focus);
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(ccx, ccy, r - 3, 0, Math.PI * 2);
    ctx.stroke();

    const label = (m.name.trim() || `BUILDER ${i + 1}`).toUpperCase();
    const size = fitFont(ctx, label, cellW - 16, 34, (s) => `700 ${s}px ${MONO}`, 13);
    ctx.font = `700 ${size}px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.textBaseline = "top";
    tracked(ctx, label, ccx, ccy + r + 22, 2, "center");
    ctx.textBaseline = "alphabetic";
  });

  // Crew band.
  const team = (input.teamName.trim() || "UNNAMED CREW").toUpperCase();
  const bandY = shell.paperY + shell.paperH - 232;
  const bandH = 96;
  ctx.fillStyle = INK;
  ctx.fillRect(shell.innerX + 8, bandY + 9, shell.innerW, bandH);
  ctx.fillStyle = PINK;
  ctx.fillRect(shell.innerX, bandY, shell.innerW, bandH);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(shell.innerX, bandY, shell.innerW, bandH);

  ctx.font = `700 16px ${MONO}`;
  ctx.fillStyle = PAPER;
  ctx.textBaseline = "top";
  tracked(ctx, `CREW OF ${n}`, shell.innerX + 18, bandY + 12, 5, "left");

  const teamSize = fitFont(ctx, team, shell.innerW - 40, 56, (s) => `700 ${s}px ${DISPLAY}`);
  ctx.font = `700 ${teamSize}px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = PAPER;
  ctx.fillText(team, w / 2, bandY + bandH - 22);

  drawGoaMark(ctx, brand.goa, shell.paperX + shell.paperW - 40, shell.paperY + 46, 124, -14);

  drawFootline(ctx, shell, w, team, `CREW PASS · ${n} BUILDERS`);

  grain(ctx, w, h, 0.045);
}

/* ------------------------------------------------------------------ public */

export function render(canvas: HTMLCanvasElement, input: RenderInput, brand: Brand) {
  const { w, h } = SIZES[input.format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  if (input.format === "pfp") renderPfp(ctx, input, brand);
  else if (input.format === "crew") renderCrew(ctx, input, brand);
  else renderCard(ctx, input, brand);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
      "image/png"
    );
  });
}
