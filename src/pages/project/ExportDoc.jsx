import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MediaBadge, SwatchStrip } from '../../components/referenceMedia';
import { extractPalette } from '../../utils/referenceMedia';

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

      const secHtml = [];
      for (const s of sections) {
        const cards = [];
        for (const m of s.picks) {
          const imgUrl = m.clip_url || m.thumbnail_url;
          const dataUrl = imgUrl ? await toDataUrl(imgUrl) : null;
          const palette = await paletteFor(dataUrl);
          const swatches = palette.map((c) => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('');
          cards.push(`
            <div class="card">
              ${dataUrl ? `<img src="${dataUrl}" alt="">` : ''}
              <div class="card-body">
                <h4>${m.title || ''}</h4>
                ${swatches ? `<div class="swatches">${swatches}</div>` : ''}
                <p class="prompt">${m.description || ''}</p>
                <p class="tags">${(m.tags || []).join(' · ')}</p>
              </div>
            </div>`);
        }
        secHtml.push(`
          <section>
            <h2>${s.order}. ${s.question}</h2>
            ${s.intent ? `<p class="intent"><b>What the AI searched for:</b> ${s.intent}</p>` : ''}
            <div class="grid">${cards.join('')}</div>
          </section>`);
      }

      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${projectName || 'DocketAI'} — Reference Selections</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:40px auto;max-width:1080px;color:#1c1b22;padding:0 20px}
  h1{font-size:28px;margin-bottom:4px} .sub{color:#5D586C;margin:0 0 32px;font-size:14px}
  section{margin-bottom:36px;page-break-inside:avoid}
  h2{font-size:19px;text-transform:capitalize;margin:0 0 4px}
  .intent{font-size:13px;color:#5D586C;margin:0 0 14px}
  .grid{display:grid;grid-template-columns:1fr;gap:20px}
  .card{border:1px solid #e3e3e8;border-radius:8px;overflow:hidden;page-break-inside:avoid}
  .card img{width:100%;max-height:360px;object-fit:contain;display:block;background:#f6f7fb}
  .swatches{display:flex;gap:4px;margin:8px 0}
  .sw{width:16px;height:16px;border-radius:50%;border:1px solid rgba(0,0,0,.1)}
  .card-body{padding:12px} h4{margin:0 0 6px;font-size:15px}
  .prompt{font-size:12.5px;line-height:1.55;color:#3B3A45;margin:0 0 8px}
  .tags{font-size:11px;color:#8A8794;margin:0}
</style></head><body>
<h1>${projectName || 'Project'} — Reference Selections</h1>
<p class="sub">${workspaceName} · exported ${new Date().toLocaleDateString()} · ${sections.reduce((n, s) => n + s.picks.length, 0)} selected references across ${sections.length} questions</p>
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
              <div className="grid grid-cols-1 gap-5">
                {s.picks.map((m) => (
                  <div key={m.reference_id} className="border border-input-border rounded-[8px] overflow-hidden" style={{ breakInside: 'avoid' }}>
                    <img src={m.clip_url || m.thumbnail_url || '/assets/project/AI-Image.jpg'} alt={m.title} className="w-full h-[320px] object-contain bg-gray-50" />
                    <div className="p-3">
                      <SwatchStrip src={m.clip_url || m.thumbnail_url} />
                      <h4 className="text-[15px] font-semibold text-text-h1 mb-1 mt-2">{m.title}</h4>
                      <p className="text-[12.5px] leading-[155%] text-[#3B3A45] mb-2">{m.description}</p>
                      <p className="text-[11px] text-[#8A8794]">{(m.tags || []).join(' · ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
};

export default ExportDoc;
