// Meeting improvements #2/#3/#4/#5 — UI components for motion/audio section badges
// and a dominant-colour swatch strip rendered under each reference image.
// Pure helpers live in src/utils/referenceMedia.js (kept separate so this file
// stays component-only for React Fast Refresh).
import { useState, useEffect, useRef } from 'react';
import { mediaTypeFor, extractPalette } from '../utils/referenceMedia';

// Section-level badge shown next to a question/section heading.
export function MediaBadge({ param }) {
  const m = mediaTypeFor(param);
  if (!m) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF1FF] border border-[#D9E1FF] text-[#3B5BFF] text-[11px] font-semibold align-middle">
      <span aria-hidden>{m.icon}</span>{m.label}
    </span>
  );
}

// Compact badge shown on an individual card.
export function MediaBadgeInline({ param }) {
  const m = mediaTypeFor(param);
  if (!m) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#EEF1FF] border border-[#D9E1FF] text-[#3B5BFF] text-[10px] font-semibold">
      <span aria-hidden>{m.icon}</span>{m.label}
    </span>
  );
}

// Renders a row of dominant-colour swatches extracted from `src`.
export function SwatchStrip({ src, max = 6 }) {
  const [colors, setColors] = useState([]);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;
    const run = () => setColors(extractPalette(img, max));
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener('load', run, { once: true });
  }, [src, max]);

  if (!src) return null;
  return (
    <div className="flex items-center gap-1 mt-1.5" aria-label="Dominant colour palette">
      <img ref={imgRef} src={src} alt="" aria-hidden className="w-px h-px absolute -z-10 opacity-0" />
      {colors.map((c, i) => (
        <span key={i} title={c} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}
