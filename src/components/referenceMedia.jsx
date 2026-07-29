// Meeting improvements #2/#3/#4/#5/#6 — UI components for card-level media
// badges, dominant-colour swatches, and HTML5 media players (hover-autoplay
// audio, click-popover video/audio).
//
// Pure helpers (mediaTypeFor, extractPalette, groupByCharacter,
// useMediaCardInteraction) live in src/utils/referenceMedia.js — kept separate
// so this file stays component-only for React Fast Refresh.
import { mediaTypeFor, extractPalette } from '../utils/referenceMedia';
import { useState, useEffect, useRef } from 'react';

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

// Card-level media badge — shown on every reference card based on its
// individual media_type (image/video/audio), NOT the section's parameter.
export function CardMediaBadge({ mediaType }) {
  if (!mediaType || mediaType === 'image') return null;
  const isVideo = mediaType === 'video';
  const isAudio = mediaType === 'audio';
  const icon = isVideo ? '🎬' : isAudio ? '🎧' : '';
  const label = isVideo ? 'Video' : isAudio ? 'Audio' : '';
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#EEF1FF] border border-[#D9E1FF] text-[#3B5BFF] text-[10px] font-semibold">
      <span aria-hidden>{icon}</span>{label}
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

// Media player popover — opens on click for video/audio references.
// Fixed-size overlay centered on screen; closes on backdrop click or Esc.
export function MediaPlayerPopover({ match, onClose }) {
  const mediaType = match?.media_type || 'image';
  const url = match?.clip_url || match?.thumbnail_url || '';
  if (!url || (mediaType !== 'video' && mediaType !== 'audio')) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={0}
    >
      <div className="bg-white rounded-[12px] shadow-2xl p-4 max-w-[640px] w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[16px] font-semibold text-text-h1 truncate">{match.title}</h3>
          <button onClick={onClose} className="text-[#8A8794] hover:text-text-h1 text-[20px] leading-none cursor-pointer ml-3">✕</button>
        </div>
        {mediaType === 'video' ? (
          <video src={url} controls autoPlay className="w-full rounded-[8px] bg-black" style={{ maxHeight: '360px' }} />
        ) : (
          <div className="py-8">
            <audio src={url} controls autoPlay className="w-full" />
            <p className="text-[13px] text-[#5D586C] mt-3 text-center">{match.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
