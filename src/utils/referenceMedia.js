// Meeting improvements #2/#3/#4/#5/#6 — pure helpers (no React components) for
// marking motion/audio reference sections, extracting dominant colour palettes
// in-browser, grouping matches by character, and managing media card interactions.
//
// #2/#3/#4: camera_angle, camera_movement, edit_pattern are *motion* sections
// (today all reference assets are stills); music is an *audio* section (no audio
// assets exist yet). #5: dominant palette is extracted from the loaded image via
// a small canvas — a same-origin image (/refs/*.jpg) never taints the canvas, a
// remote one only stays readable when it is loaded with crossOrigin="anonymous"
// AND the bucket sends CORS headers (see SwatchStrip). No external API, no
// ingest/schema change. #6: groupByCharacter for casting dividers.

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Reference media source resolution ────────────────────────────────────
// The reference bank is local today (159 stills in public/refs) and blob
// storage (S3 / MinIO / Azure / CDN) in production, so thumbnail_url / clip_url
// arrive either as a relative path ("/refs/ref_061.jpg") or as an absolute
// "https://…" URL. Nothing is configured: every item is classified from its own
// value at render time and falls back down a candidate chain if it fails.

export const REFERENCE_PLACEHOLDER = '/assets/project/AI-Image.jpg';

const NON_IMAGE_EXT = /\.(mp4|m4v|mov|webm|avi|mkv|mp3|wav|m4a|aac|ogg|oga|flac)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i;

// True for absolute http(s) URLs and protocol-relative "//host/…" ones.
// False for relative paths, data:/blob:, empty, null and non-strings.
export function isRemoteUrl(value) {
  return typeof value === 'string' && /^\s*(https?:)?\/\//i.test(value);
}

// Can this asset be painted into an <img>? A .mp4 clip_url on a video match
// cannot, a still (or an untyped/unsuffixed URL on an image match) can.
function isStillAsset(url, mediaType) {
  if (typeof url !== 'string' || !url.trim()) return false;
  if (IMAGE_EXT.test(url)) return true;
  if (NON_IMAGE_EXT.test(url)) return false;
  return !mediaType || mediaType === 'image';
}

// Ordered list of sources to try for a match's still image:
//   thumbnail_url (or an image clip_url when there is no thumbnail)
//   → the conventional local file /refs/{reference_id}.jpg
//   → the shared placeholder.
// Empties and duplicates are dropped so no source is ever attempted twice.
// `preferClip` puts an image clip_url first — the export/print card wants the
// full-res asset rather than the thumbnail.
export function referenceImageCandidates(match, { preferClip = false } = {}) {
  const m = match || {};
  const out = [];
  const add = (value) => {
    if (typeof value !== 'string') return;
    const v = value.trim();
    if (v && !out.includes(v)) out.push(v);
  };

  const clip = isStillAsset(m.clip_url, m.media_type) ? m.clip_url : null;
  if (preferClip) add(clip);
  add(m.thumbnail_url);
  if (!preferClip && !m.thumbnail_url) add(clip);
  if (m.reference_id) add(`/refs/${m.reference_id}.jpg`);
  add(REFERENCE_PLACEHOLDER);
  return out;
}

// Hook: walks a candidate list with the <img> onError event — every failure
// advances to the next source, and the list is the bound. The attempt index is
// keyed on the joined candidate list, so a different match starts over at 0
// while a re-render of the same match keeps its progress. The index only ever
// increases and the candidates are de-duplicated, so a src is never re-assigned
// and the walk always terminates on the last candidate (the placeholder).
export function useFallbackSrc(candidates) {
  const chain = Array.isArray(candidates) ? candidates : [];
  const chainKey = chain.join('|');
  const last = Math.max(chain.length - 1, 0);
  const [attempt, setAttempt] = useState({ key: chainKey, index: 0 });

  const index = attempt.key === chainKey ? Math.min(attempt.index, last) : 0;

  const onError = useCallback(() => {
    setAttempt((prev) => {
      const current = prev.key === chainKey ? prev.index : 0;
      // Exhausted: stay put and change nothing, so React re-renders nothing and
      // the failing src is never re-assigned (this is what bounds the loop).
      if (current >= last) return prev.key === chainKey ? prev : { key: chainKey, index: last };
      return { key: chainKey, index: current + 1 };
    });
  }, [chainKey, last]);

  return { src: chain[index] || '', onError, exhausted: index >= last };
}

export const MEDIA_TYPE = {
  camera_angle: { label: 'Motion / video reference', icon: '🎬' },
  camera_movement: { label: 'Motion / video reference', icon: '🎬' },
  edit_pattern: { label: 'Motion / video reference', icon: '🎬' },
  music: { label: 'Audio reference', icon: '🎧' },
};

export function mediaTypeFor(param) {
  return param ? MEDIA_TYPE[param] : null;
}

// Extract up to `count` dominant hex colours from a loaded <img> element.
export function extractPalette(img, count = 6) {
  try {
    if (!img || !img.complete || !img.naturalWidth) return [];
    const w = 28, h = 28;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 125) continue; // transparent
      const key = (data[i] & 0xf0) * 256 * 16 + (data[i + 1] & 0xf0) * 16 + (data[i + 2] & 0xf0);
      const cur = buckets.get(key);
      if (cur) { cur.w++; cur.r += data[i]; cur.g += data[i + 1]; cur.b += data[i + 2]; }
      else buckets.set(key, { w: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    const sorted = [...buckets.values()].sort((a, b) => b.w - a.w);
    const out = [];
    for (const c of sorted) {
      const r = Math.round(c.r / c.w), g = Math.round(c.g / c.w), b = Math.round(c.b / c.w);
      if (out.some(h => Math.abs(h[0] - r) + Math.abs(h[1] - g) + Math.abs(h[2] - b) < 36)) continue;
      out.push([r, g, b]);
      if (out.length >= count) break;
    }
    return out.map(([r, g, b]) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join(''));
  } catch {
    return [];
  }
}

// Meeting improvement #6: group matches by character for casting dividers.
// Returns [{ character: {label, casting, wardrobe, styling_detail}, matches: [...] }, ...]
export function groupByCharacter(matches) {
  const groups = [];
  const ungrouped = [];
  for (const m of matches) {
    const chars = m.characters || [];
    if (chars.length === 0) {
      ungrouped.push(m);
    } else {
      for (const c of chars) {
        let g = groups.find(g => g.character.label === c.label);
        if (!g) {
          g = { character: c, matches: [] };
          groups.push(g);
        }
        g.matches.push(m);
      }
    }
  }
  groups.sort((a, b) => b.matches.length - a.matches.length);
  if (ungrouped.length > 0) groups.push({ character: null, matches: ungrouped });
  return groups;
}

// Hook: manages hover-autoplay for audio cards + click-popover for video/audio.
// Returns: { activePopover, setActivePopover, onCardClick, onCardHover, onCardLeave }
export function useMediaCardInteraction() {
  const [activePopover, setActivePopover] = useState(null);
  const audioRef = useRef(null);

  const onCardClick = useCallback((match) => {
    if (match?.media_type === 'video' || match?.media_type === 'audio') {
      setActivePopover(match);
    }
  }, []);

  const onCardHover = useCallback((match) => {
    if (match?.media_type === 'audio' && match?.clip_url) {
      try {
        if (!audioRef.current) audioRef.current = new Audio(match.clip_url);
        else if (audioRef.current.src !== match.clip_url) {
          audioRef.current.pause();
          audioRef.current = new Audio(match.clip_url);
        }
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      } catch { /* ignore audio errors */ }
    }
  }, []);

  const onCardLeave = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  useEffect(() => () => { if (audioRef.current) audioRef.current.pause(); }, []);

  return { activePopover, setActivePopover, onCardClick, onCardHover, onCardLeave };
}
