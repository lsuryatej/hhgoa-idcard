# Frame in Goa

Photo frame and builder-pass generator for **Hacker House Goa 2026**. Drop in a
photo, get a branded graphic, download it, post it to X. No login, no signup, no
crop step.

Built for HH Goa 2026 shortlisting Task #1. Hashtag: `#FrameInGoa`.

## What it makes

| Format | Output | Notes |
|---|---|---|
| **PFP Frame** | 1024×1024 | Ring frame that survives X's circular avatar crop. Three ring colours. |
| **Builder ID Card** | 1080×1350 | Event badge: photo, name, stack, generated builder class, pass number, barcode. |
| **Crew** | 1080×1350 | Two to six teammates in one frame, named, with a crew name. |

## Branding

Colours, type and motifs are lifted from hhgoa.com rather than approximated:

- **Palette** — green `#0B6839`, yellow `#FEE101`, off-white `#FFFBE8`, hot pink `#FF0080`
- **Type** — [Imbue](https://fonts.google.com/specimen/Imbue) for display, [Victor Mono](https://rubjo.github.io/victor-mono/) for everything else. Both OFL, self-hosted as latin-subset woff2.
- **Motifs** — the site's 101×7 diamond-and-triangle tape strip, the गोवा Devanagari mark, sunrise rays, and the zero-blur hard offset shadows used throughout the site.

## Running it

```bash
npm install && npm run dev
```

Then open http://localhost:3111.

## Deploying

```bash
npx vercel deploy --prod
```

That is the whole deploy. The app works immediately without any configuration.

### Optional: link previews on desktop

To make a shared X link render the graphic in its preview card, add blob
storage. In the Vercel dashboard: **Storage → Create → Blob**, connect it to the
project, redeploy. Vercel injects `BLOB_READ_WRITE_TOKEN` on its own.

With it, pressing Share uploads the PNG, mints a `/s/<id>` page, and posts that
link. The page's `opengraph-image` route composes the graphic onto a branded
1200×630 card, so the tweet preview shows the real output rather than a
placeholder. Without it, everything else still works and the composer just opens
without a link card.

## How the share flow works

1. **Phones** get `navigator.share` with the PNG as a real file, so the X app
   opens with the image already attached. One tap, no download step.
2. **Desktop** uploads to blob storage, opens the X composer pre-filled with the
   caption plus a `/s/<id>` link whose OG image is the graphic, and downloads the
   PNG at the same time.
3. **If storage is unconfigured or the upload fails**, it downloads the PNG,
   opens the composer anyway, and says to attach the file manually.

## Handling real photos

- **HEIC/HEIF from iPhone** — tries the browser's native decoder first (Safari
  has one), and only falls back to the `heic-to` wasm decoder when that fails, so
  iPhone users on Safari never download the 1.5MB wasm.
- **EXIF rotation** — decoded with `imageOrientation: "from-image"`, so portrait
  shots do not land sideways.
- **Any aspect ratio** — cover-fit with an adjustable focus point. Drag the
  preview to reposition and use the zoom slider. Nobody has to pre-crop.
- **Large originals** — downscaled to a 2200px long edge before compositing, which
  is what keeps a 48MP photo feeling instant.

Rendering is plain Canvas 2D on the client. Nothing is uploaded unless you press
Share.

## Layout

```
app/
  page.tsx                     generator page
  api/share/route.ts           PNG -> blob storage, returns a share id
  s/[id]/page.tsx              share page
  s/[id]/opengraph-image.tsx   dynamic OG card, font-free by design
components/Generator.tsx       all UI state, upload, pan/zoom, share
lib/render.ts                  the three canvas renderers
lib/image.ts                   HEIC, EXIF, downscale
lib/titles.ts                  builder class + pass number
```

The builder class and pass number are hashed from name and stack, so they never
change once someone has shared their card.

## Licences

Imbue and Victor Mono are SIL Open Font License. Brand marks belong to Hacker
House Goa / 2:47 pm Studio and are used for the event's own shortlisting task.
