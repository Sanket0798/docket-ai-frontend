import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MediaBadge, CardMediaBadge, SwatchStrip } from '../../components/referenceMedia';
import { extractPalette, groupByCharacter, mediaTypeFor } from '../../utils/referenceMedia';

// Escape every piece of user/data-derived text before it goes into the
// standalone HTML string — a stray `<` or `&` in a title, prompt or tag would
// otherwise corrupt the exported file. Never applied to values we build
// ourselves (hex colours, data: URIs).
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Static equivalents of <MediaBadge> / <CardMediaBadge> for the HTML export.
const sectionBadgeHtml = (param) => {
  const m = mediaTypeFor(param);
  if (!m) return '';
  return `<span class="media-badge"><span aria-hidden="true">${m.icon}</span>${esc(m.label)}</span>`;
};

const cardBadgeHtml = (mediaType) => {
  const isVideo = mediaType === 'video';
  const isAudio = mediaType === 'audio';
  if (!isVideo && !isAudio) return '';
  return `<span class="card-badge"><span aria-hidden="true">${isVideo ? '🎬' : '🎧'}</span>${isVideo ? 'Video' : 'Audio'}</span>`;
};

// One selected reference in the on-screen/print document — single column,
// full-res clip, object-contain.
const PickCard = ({ m }) => (
  <div className="border border-input-border rounded-[8px] overflow-hidden relative" style={{ breakInside: 'avoid' }}>
    <div className="absolute top-2 right-2 z-10"><CardMediaBadge mediaType={m.media_type} /></div>
    <img src={m.clip_url || m.thumbnail_url || '/assets/project/AI-Image.jpg'} alt={m.title} className="w-full h-[320px] object-contain bg-gray-50" />
    <div className="p-3">
      <SwatchStrip src={m.clip_url || m.thumbnail_url} />
      <h4 className="text-[15px] font-semibold text-text-h1 mb-1 mt-2">{m.title}</h4>
      <p className="text-[12.5px] leading-[155%] text-[#3B3A45] mb-2">{m.description}</p>
      <p className="text-[11px] text-[#8A8794]">{(m.tags || []).join(' · ')}</p>
    </div>
  </div>
);

// Printable export of the director's selections: every question + the chosen
// reference images + scene prompts.
//  - "Download PDF"  -> browser print dialog (Save as PDF), print CSS applied
//  - "Download HTML" -> standalone .html file with images inlined as data URLs
const ExportDoc = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';

  const [projectName, setProjectName] = useState(location.state?.projectName || '');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${projectId}/questions`),
      projectName ? Promise.resolve(null) : api.get(`/projects/${projectId}`),
    ])
      .then(([qRes, pRes]) => {
        if (pRes) setProjectName(pRes.data.name || '');
        const rows = qRes.data.questions || [];
        setSections(rows.map((q) => {
          const meta = q.thumbnails || {};
          const selected = new Set(q.selected_thumbnails || []);
          return {
            order: q.question_order,
            question: q.question,
            name: meta.name || '',
            intent: meta.intent || '',
            picks: (meta.matches || []).filter((m) => selected.has(m.reference_id)),
          };
        }).filter((s) => s.picks.length > 0));
      })
      .catch((err) => { console.error(err); toast('Could not load selections for export.', 'error'); })
      .finally(() => setLoading(false));
  }, [projectId]);

  const markCompleted = () => {
    // fire-and-forget: exporting finalises the project
    api.put(`/projects/${projectId}/status`, { status: 'completed' }).catch(() => {});
  };

  const handlePdf = () => {
    markCompleted();
    window.print();
  };

  // Build a fully standalone HTML file: fetch each selected image and inline it
  // as a data URL so the exported file works anywhere, offline.
  const handleHtml = async () => {
    setDownloading(true);
    try {
      const toDataUrl = async (url) => {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          return await new Promise((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.readAsDataURL(blob);
          });
        } catch { return null; }
      };

      // #5: extract the dominant palette from the inlined image (data URL) so the
      // standalone HTML export carries colour swatches too — no API, in-browser.
      const paletteFor = (dataUrl) => new Promise((resolve) => {
        if (!dataUrl) return resolve([]);
        const img = new Image();
        img.onload = () => resolve(extractPalette(img, 6));
        img.onerror = () => resolve([]);
        img.src = dataUrl;
      });

      const cardHtml = async (m) => {
        const imgUrl = m.clip_url || m.thumbnail_url;
        const dataUrl = imgUrl ? await toDataUrl(imgUrl) : null;
        const palette = await paletteFor(dataUrl);
        const swatches = palette.map((c) => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('');
        return `
            <div class="card">
              ${cardBadgeHtml(m.media_type)}
              ${dataUrl ? `<img src="${dataUrl}" alt="">` : ''}
              <div class="card-body">
                <h4>${esc(m.title || '')}</h4>
                ${swatches ? `<div class="swatches">${swatches}</div>` : ''}
                <p class="prompt">${esc(m.description || '')}</p>
                <p class="tags">${esc((m.tags || []).join(' · '))}</p>
              </div>
            </div>`;
      };

      const cardsHtml = async (matches) => {
        const cards = [];
        for (const m of matches) cards.push(await cardHtml(m));
        return cards.join('');
      };

      const secHtml = [];
      for (const s of sections) {
        let body;
        if (s.name === 'casting') {
          // #6: casting is grouped by character with labelled dividers, same as Preview.
          const groups = groupByCharacter(s.picks);
          const blocks = [];
          for (const g of groups) {
            const divider = g.character
              ? `<div class="divider"><span class="chip">${esc(g.character.label.replace(/_/g, ' '))}</span><span class="cast">${esc(g.character.casting || '')}</span></div>`
              : (groups.length > 1 ? '<div class="divider"><span class="other">Other references</span></div>' : '');
            blocks.push(`<div class="group">${divider}<div class="grid">${await cardsHtml(g.matches)}</div></div>`);
          }
          body = `<div class="groups">${blocks.join('')}</div>`;
        } else {
          body = `<div class="grid">${await cardsHtml(s.picks)}</div>`;
        }
        secHtml.push(`
          <section>
            <div class="sec-head"><h2>${esc(s.order)}. ${esc(s.question)}</h2>${sectionBadgeHtml(s.name)}</div>
            ${s.intent ? `<p class="intent"><b>What the AI searched for:</b> ${esc(s.intent)}</p>` : ''}
            ${body}
          </section>`);
      }

      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(projectName || 'DocketAI')} — Reference Selections</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:40px auto;max-width:1080px;color:#1c1b22;padding:0 20px}
  h1{font-size:28px;margin-bottom:4px} .sub{color:#5D586C;margin:0 0 32px;font-size:14px}
  section{margin-bottom:36px;page-break-inside:avoid}
  .sec-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:0 0 4px}
  h2{font-size:19px;text-transform:capitalize;margin:0}
  .media-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:#EEF1FF;border:1px solid #D9E1FF;color:#3B5BFF;font-size:11px;font-weight:600}
  .intent{font-size:13px;color:#5D586C;margin:0 0 14px}
  .groups{display:flex;flex-direction:column;gap:24px}
  .group{page-break-inside:avoid}
  .divider{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #e3e3e8}
  .chip{padding:4px 12px;border-radius:999px;background:#EEF2FF;color:#4338CA;font-size:13px;font-weight:600}
  .cast{font-size:12px;color:#8A8794} .other{font-size:13px;color:#8A8794;font-weight:500}
  .grid{display:grid;grid-template-columns:1fr;gap:20px}
  .card{position:relative;border:1px solid #e3e3e8;border-radius:8px;overflow:hidden;page-break-inside:avoid}
  .card img{width:100%;max-height:360px;object-fit:contain;display:block;background:#f6f7fb}
  .card-badge{position:absolute;top:8px;right:8px;z-index:1;display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:999px;background:#EEF1FF;border:1px solid #D9E1FF;color:#3B5BFF;font-size:10px;font-weight:600}
  .swatches{display:flex;gap:4px;margin:8px 0}
  .sw{width:16px;height:16px;border-radius:50%;border:1px solid rgba(0,0,0,.1)}
  .card-body{padding:12px} h4{margin:0 0 6px;font-size:15px}
  .prompt{font-size:12.5px;line-height:1.55;color:#3B3A45;margin:0 0 8px}
  .tags{font-size:11px;color:#8A8794;margin:0}
</style></head><body>
<h1>${esc(projectName || 'Project')} — Reference Selections</h1>
<p class="sub">${esc(workspaceName)} · exported ${new Date().toLocaleDateString()} · ${sections.reduce((n, s) => n + s.picks.length, 0)} selected references across ${sections.length} questions</p>
${secHtml.join('')}
</body></html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(projectName || 'docketai-export').replace(/\s+/g, '-').toLowerCase()}-selections.html`;
      a.click();
      URL.revokeObjectURL(a.href);
      markCompleted();
      toast('HTML export downloaded.', 'success');
    } catch (err) {
      console.error(err);
      toast('Export failed. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const totalPicks = sections.reduce((n, s) => n + s.picks.length, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b border-input-border px-4 lg:px-[60px] py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/preview`, { state: { workspaceName, projectName } })}
            className="cursor-pointer"
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <span className="text-[17px] font-medium text-text-h1">Export — {projectName || '...'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleHtml}
            disabled={loading || downloading || totalPicks === 0}
            className="h-[36px] px-4 border border-brand-color text-brand-color text-[14px] font-medium rounded-[6px] hover:bg-blue-50 disabled:opacity-40 transition cursor-pointer"
          >
            {downloading ? 'Preparing…' : 'Download HTML'}
          </button>
          <button
            onClick={handlePdf}
            disabled={loading || totalPicks === 0}
            className="h-[36px] px-4 bg-brand-color text-white text-[14px] font-medium rounded-[6px] hover:bg-blue-700 disabled:opacity-40 transition cursor-pointer"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Document body — this is what prints */}
      <main className="px-4 lg:px-[60px] py-10 max-w-[1080px] mx-auto">
        <h1 className="text-[26px] font-semibold text-text-h1 mb-1">{projectName || 'Project'} — Reference Selections</h1>
        <p className="text-[13px] text-[#5D586C] mb-8">
          {workspaceName} · {new Date().toLocaleDateString()} · {totalPicks} selected references across {sections.length} questions
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-brand-color border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sections.length === 0 ? (
          <p className="text-sm text-[#8A8794]">No selections yet — go back and pick references first.</p>
        ) : (
          sections.map((s) => (
            <section key={s.order} className="mb-9" style={{ breakInside: 'avoid' }}>
              <div className="flex items-center gap-3 flex-wrap mb-0.5">
                <h2 className="text-[19px] font-medium text-text-h1 capitalize">{s.order}. {s.question}</h2>
                <MediaBadge param={s.name} />
              </div>
              {s.intent && (
                <p className="text-[13px] text-[#5D586C] mb-3">
                  <span className="font-medium text-[#3B3A45]">What the AI searched for: </span>{s.intent}
                </p>
              )}
              {s.name === 'casting' ? (
                // Casting: group by character with labelled dividers (#6)
                (() => {
                  const groups = groupByCharacter(s.picks);
                  return (
                    <div className="space-y-6">
                      {groups.map((g, gi) => (
                        <div key={gi} style={{ breakInside: 'avoid' }}>
                          {g.character ? (
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-input-border">
                              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[13px] font-semibold">
                                {g.character.label.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[12px] text-[#8A8794]">{g.character.casting}</span>
                            </div>
                          ) : (
                            groups.length > 1 && (
                              <div className="mb-3 pb-2 border-b border-input-border">
                                <span className="text-[13px] text-[#8A8794] font-medium">Other references</span>
                              </div>
                            )
                          )}
                          <div className="grid grid-cols-1 gap-5">
                            {g.matches.map((m) => <PickCard key={m.reference_id} m={m} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {s.picks.map((m) => <PickCard key={m.reference_id} m={m} />)}
                </div>
              )}
            </section>
          ))
        )}
      </main>
    </div>
  );
};

export default ExportDoc;
