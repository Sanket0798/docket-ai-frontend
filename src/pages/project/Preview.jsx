import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

// Gradient fallbacks for the placeholder image preview (real clip media isn't
// generated yet — the default view surfaces the scene prompt + metadata instead).
const CARD_GRADIENTS = [
  'from-yellow-200 via-orange-300 to-purple-400',
  'from-orange-200 via-yellow-300 to-green-300',
  'from-purple-200 via-blue-300 to-orange-300',
];

const fmt = (n) => (typeof n === 'number' ? n.toFixed(3) : '—');

const Preview = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';

  const [data, setData] = useState(null);        // full /scenes response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [projectName, setProjectName] = useState(location.state?.projectName || '');

  // 'cards' = scene-prompt cards (default) | 'images' = placeholder image preview
  const [view, setView] = useState('cards');
  const [openMeta, setOpenMeta] = useState({});   // `${pi}-${mi}` -> bool
  const [wishlisted, setWishlisted] = useState({});
  const [deleted, setDeleted] = useState({});
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      // 10 matches per parameter — shown 3-up with vertical scroll through parameters.
      api.get(`/projects/${projectId}/scenes?top_k=10`),
      projectName ? Promise.resolve(null) : api.get(`/projects/${projectId}`),
    ])
      .then(([scenesRes, projectRes]) => {
        setData(scenesRes.data);
        if (projectRes) setProjectName(projectRes.data.name || '');
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.message ||
            'Could not generate scene references. Make sure a script was uploaded, then retry.'
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.put(`/projects/${projectId}/status`, { status: 'completed' });
      navigate(`/workspace/${workspaceId}/project/${projectId}/success`, { state: { workspaceName } });
    } catch (err) {
      console.error(err);
      toast('Export failed. Please try again.', 'error');
    } finally {
      setExporting(false);
      setShowConfirm(false);
    }
  };

  const handleWishlist = async (pi, mi, param, match) => {
    const key = `${pi}-${mi}`;
    if (wishlisted[key]) return;
    try {
      await api.post('/wishlist', {
        project_id: projectId,
        image_url: match.thumbnail_url || null,
        image_index: mi,
        question_id: param.name,
        tags: (match.tags || []).join(','),
      });
      setWishlisted((p) => ({ ...p, [key]: true }));
      toast('Added to wishlist!', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to add to wishlist', 'error');
    }
  };

  const toggleMeta = (key) => setOpenMeta((p) => ({ ...p, [key]: !p[key] }));

  const parameters = data?.parameters || [];
  const profileApplied = data?.profile_present;

  // ── Metadata block (the "why this matched / ranked on top") ──────────
  const MetaPanel = ({ match, rank }) => (
    <div className="mt-2 text-[12px] leading-[18px] text-[#4A4755] bg-[#F4F6FF] border border-[#D9E1FF] rounded-[6px] p-3 space-y-2">
      <div>
        <p className="font-semibold text-[11px] uppercase tracking-wide text-brand-color mb-1">Matched tags</p>
        <div className="flex flex-wrap gap-1.5">
          {(match.tags || []).map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-white border border-[#D9E1FF] text-[11px] text-[#3B3A45]">{t}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Rank</span><span className="text-right font-medium text-text-h1">#{rank}</span>
        <span>Final score</span><span className="text-right font-medium text-text-h1">{fmt(match.score)}</span>
        <span>Script similarity</span><span className="text-right">{fmt(match.cosine_score)}</span>
        <span>Quadrant match</span>
        <span className="text-right">{match.quadrant_match ? `✓ ${match.quadrant_affinity}` : '—'}</span>
        <span>Axis overlap</span><span className="text-right">{fmt(match.axis_overlap)}</span>
      </div>
      <p className="pt-1 border-t border-[#D9E1FF] text-[#5D586C]">
        {match.quadrant_match
          ? `Ranked #${rank} — boosted because its "${match.quadrant_affinity}" affinity matches your director profile.`
          : `Ranked #${rank} on script similarity (no profile boost on this clip).`}
      </p>
    </div>
  );

  // ── A single matched-reference card ──────────────────────────────────
  const MatchCard = ({ param, m, pi, mi }) => {
    const key = `${pi}-${mi}`;
    if (deleted[key]) return null;
    return (
      <div className="rounded-[8px] border border-input-border bg-white flex flex-col overflow-hidden">
        {/* Header: rank/score + actions */}
        <div className="flex items-center justify-between px-3 pt-3">
          <span className="px-2 py-0.5 rounded-[4px] bg-brand-color text-white text-[11px] font-medium">#{mi + 1} · {fmt(m.score)}</span>
          <div className="flex gap-1">
            <button onClick={() => setDeleted((p) => ({ ...p, [key]: true }))} className="w-6 h-5 bg-gray-50 rounded-[6px] flex items-center justify-center hover:bg-red-50 cursor-pointer" title="Remove">
              <img src="/assets/icons/delete-fill.svg" alt="" />
            </button>
            <button onClick={() => handleWishlist(pi, mi, param, m)} className={`w-6 h-5 rounded-[6px] flex items-center justify-center cursor-pointer ${wishlisted[key] ? 'bg-red-100' : 'bg-gray-50 hover:bg-red-50'}`} title="Add to wishlist">
              <img src="/assets/icons/heart.svg" alt="" className={wishlisted[key] ? 'opacity-100' : 'opacity-70'} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="px-3 pt-2">
          <p className="text-[15px] font-semibold text-text-h1 leading-tight">{m.title}</p>
          <p className="text-[11px] text-[#8A8794] mt-0.5">{m.primary_tag}{m.duration_sec ? ` · ${m.duration_sec}s` : ''}</p>
        </div>

        {/* Media area — the matched reference still (always shown), plus the
            scene prompt beneath it in the default 'cards' view. */}
        <div className="mx-3 mt-2 rounded-[6px] overflow-hidden bg-gray-50">
          <img
            src={m.thumbnail_url || '/assets/project/AI-Image.jpg'}
            alt={m.title}
            loading="lazy"
            className={`w-full object-cover ${view === 'images' ? 'h-[200px]' : 'h-[130px]'}`}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('bg-gradient-to-br', ...CARD_GRADIENTS[mi % 3].split(' '), view === 'images' ? 'h-[200px]' : 'h-[130px]');
            }}
          />
        </div>
        {view === 'cards' && (
          <div className="mx-3 mt-2 rounded-[6px] bg-[#F7F8FE] border border-[#E6EAFA] p-3 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-color mb-1">Scene prompt</p>
            <p className="text-[13px] leading-[160%] text-[#3B3A45]">{m.description}</p>
          </div>
        )}

        {/* Why this matched */}
        <div className="px-3 pb-3 pt-2">
          <button onClick={() => toggleMeta(key)} className="flex items-center gap-1 text-[12px] text-brand-color font-medium cursor-pointer">
            Why this matched
            <span className={`transition-transform ${openMeta[key] ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {openMeta[key] && <MetaPanel match={m} rank={mi + 1} />}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] py-[51px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-[40px]">
          <span className="text-text-h1 text-[22px] lg:text-[34px] leading-12 font-medium truncate">{workspaceName} /</span>
          <span className="font-light text-[18px] lg:text-[30px] leading-10 text-[#A7A7A7] truncate">{projectName || '...'}</span>
        </div>

        {/* Heading */}
        <div className="flex flex-row mb-2 gap-5 items-center">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/questions`, { state: { workspaceName, resumeStep: 3 } })}
            className="cursor-pointer"
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <h1 className="font-medium text-[22px] lg:text-[34px] leading-[48px] text-text-h1">Preview</h1>
        </div>
        <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-5" style={{ fontFamily: 'Geist, sans-serif' }}>
          Reference clips matched to your script{profileApplied ? ' and re-ranked to your Director Profile' : ''}
        </p>

        {/* Profile / method banner */}
        {data && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-[13px]">
            <span className={`px-3 py-1 rounded-full border ${profileApplied ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              {profileApplied ? '✓ Director Profile applied' : 'No profile — ranked by script similarity'}
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
              Intent: {data.intent_method || 'n/a'}
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
              {parameters.length} creative parameters
            </span>
          </div>
        )}

        {/* View tabs — scene prompts (default) vs placeholder image preview */}
        <div className="flex items-center gap-1 border-b border-input-border mb-7">
          {[
            { id: 'cards', label: 'Scenes (image + prompt)' },
            { id: 'images', label: 'Images' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`px-4 py-3 text-[14px] font-medium border-b-2 transition cursor-pointer ${
                view === t.id ? 'border-brand-color text-brand-color' : 'border-transparent text-text-h2 hover:text-[#4A4755]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-4 border-brand-color border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#5D586C]">Searching the reference bank and re-ranking to your profile…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 border border-input-border rounded-[6px] bg-[#FFF7F7]">
            <p className="text-sm text-red-700 max-w-md text-center">{error}</p>
            <button onClick={load} className="px-5 h-[38px] bg-brand-color text-white text-[14px] font-medium rounded-[6px] cursor-pointer">Retry</button>
          </div>
        ) : (
          <div className="space-y-10">
            {parameters.map((param, pi) => (
              <section key={param.name}>
                <h2 className="font-medium text-[20px] leading-8 text-text-h1 capitalize">
                  {param.question || param.name.replace(/_/g, ' ')}
                </h2>
                <p className="font-normal text-sm leading-[150%] text-[#5D586C] mb-4">
                  <span className="font-medium text-[#3B3A45]">What the AI searched for: </span>
                  {param.inferred_intent}
                </p>

                {/* 3 cards across; the page scrolls vertically through parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {param.matches.map((m, mi) => (
                    <MatchCard key={m.reference_id} param={param} m={m} pi={pi} mi={mi} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Export */}
        {!loading && !error && (
          <button
            onClick={() => setShowConfirm(true)}
            className="mt-12 flex items-center justify-center w-[192px] h-[38px] px-6 bg-brand-color hover:bg-blue-700 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer"
          >
            Save and export
          </button>
        )}
      </main>

      <Footer />

      {showConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white border border-[#CAC9CD] rounded-[6px] w-full max-w-[560px] lg:max-w-[1000px] lg:h-[488px] mx-4 px-6 py-10 flex flex-col items-center justify-center text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-[26px] lg:text-[34px] leading-[48px] text-text-h1 mb-1">Are you sure ?</h2>
            <p className="font-normal text-base lg:text-lg leading-[130%] text-[#5D586C] mb-5">Are you sure you want to save and export? No changes can be<br />done once file is exported</p>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setShowConfirm(false)} className="h-[38px] w-[192px] px-8 bg-[#E0E8FF] hover:bg-gray-200 text-black text-[15px] font-medium rounded-[6px] transition cursor-pointer">Cancel</button>
              <button onClick={handleExport} disabled={exporting} className="h-[38px] w-[192px] px-8 bg-brand-color text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer">
                {exporting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Preview;
