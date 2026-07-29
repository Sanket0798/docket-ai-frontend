// Meeting improvements #2/#3/#4/#5/#6 — pure helpers (no React components) for
// marking motion/audio reference sections, extracting dominant colour palettes
// in-browser, grouping matches by character, and managing media card interactions.
//
// #2/#3/#4: camera_angle, camera_movement, edit_pattern are *motion* sections
// (today all reference assets are stills); music is an *audio* section (no audio
// assets exist yet). #5: dominant palette is extracted from the loaded image via
// a small canvas — reference images are same-origin (/refs/*.jpg) so the canvas is
// never tainted. No external API, no ingest/schema change. #6: groupByCharacter
// for casting dividers.

import { useState, useEffect, useRef, useCallback } from 'react';

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
