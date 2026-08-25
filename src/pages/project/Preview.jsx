import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { MediaBadge, CardMediaBadge, SwatchStrip, MediaPlayerPopover, ReferenceImage } from '../../components/referenceMedia';
import { useMediaCardInteraction, groupByCharacter } from '../../utils/referenceMedia';

const fmt = (n) => (typeof n === 'number' ? n.toFixed(3) : '—');

// Preview = the director's actual selections. Each question section shows the
// references the user picked on the selection screen (with image + scene
// prompt + ranking transparency). Export leads to the printable export view.
const Preview = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState(location.state?.projectName || '');
  const [openMeta, setOpenMeta] = useState({});
  const { activePopover, setActivePopover, onCardClick, onCardHover, onCardLeave } = useMediaCardInteraction();

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/projects/${projectId}/questions`),
      projectName ? Promise.resolve(null) : api.get(`/projects/${projectId}`),
    ])
      .then(([qRes, projectRes]) => {
        setQuestions(qRes.data.questions || []);
        if (projectRes) setProjectName(projectRes.data.name || '');
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.message || 'Could not load your selections.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId]);

  // Build per-question selected matches.
  const sections = questions.map((q) => {
    const meta = q.thumbnails || {};
    const matches = meta.matches || [];
    const selected = new Set(q.selected_thumbnails || []);
    return {
      id: q.id,
      order: q.question_order,
      question: q.question,
      name: meta.name || '',
      intent: meta.intent || '',
      picks: matches.filter((m) => selected.has(m.reference_id)),
    };
  });
  const totalPicks = sections.reduce((n, s) => n + s.picks.length, 0);

  const MetaPanel = ({ m }) => (
    <div className="mt-2 text-[12px] leading-[18px] text-[#4A4755] bg-[#F4F6FF] border border-[#D9E1FF] rounded-[6px] p-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(m.tags || []).map((t) => (
          <span key={t} className="px-2 py-0.5 rounded-full bg-white border border-[#D9E1FF] text-[11px] text-[#3B3A45]">{t}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Final score</span><span className="text-right font-medium text-text-h1">{fmt(m.score)}</span>
        <span>Match similarity</span><span className="text-right">{fmt(m.cosine_score)}</span>
        <span>Quadrant match</span>
        <span className="text-right">{m.quadrant_match ? `✓ ${m.quadrant_affinity}` : '—'}</span>
      </div>
    </div>
  );

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
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/questions`, { state: { workspaceName } })}
            className="cursor-pointer"
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <h1 className="font-medium text-[22px] lg:text-[34px] leading-[48px] text-text-h1">Preview</h1>
        </div>
        <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-6" style={{ fontFamily: 'Geist, sans-serif' }}>
          Your selected references across all {sections.length || 14} creative questions — {totalPicks} picks total
        </p>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-4 border-brand-color border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#5D586C]">Loading your selections…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 border border-input-border rounded-[6px] bg-[#FFF7F7]">
            <p className="text-sm text-red-700 max-w-md text-center">{error}</p>
            <button onClick={load} className="px-5 h-[38px] bg-brand-color text-white text-[14px] font-medium rounded-[6px] cursor-pointer">Retry</button>
          </div>
        ) : (
          <div className="space-y-10">
            {sections.map((s) => (
              <section key={s.id}>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-medium text-[20px] leading-8 text-text-h1 capitalize">
                    {s.order}. {s.question}
                  </h2>
                  <MediaBadge param={s.name} />
                </div>
                {s.intent && (
                  <p className="font-normal text-sm leading-[150%] text-[#5D586C] mb-4">
                    <span className="font-medium text-[#3B3A45]">What the AI searched for: </span>{s.intent}
                  </p>
                )}

                {s.picks.length === 0 ? (
                  <div className="border border-dashed border-input-border rounded-[8px] p-5 text-[13px] text-[#8A8794] flex items-center justify-between">
                    <span>No references selected for this question yet.</span>
                    <button
                      onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/questions`, { state: { workspaceName } })}
                      className="text-brand-color font-medium cursor-pointer"
                    >
                      Select now →
                    </button>
                  </div>
                ) : s.name === 'casting' ? (
                  // Casting: group by character with labelled dividers (#6)
                  (() => {
                    const groups = groupByCharacter(s.picks);
                    return (
                      <div className="space-y-6">
                        {groups.map((g, gi) => (
                          <div key={gi}>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                              {g.matches.map((m) => {
                                const key = `${s.id}-${m.reference_id}`;
                                return (
                                  <div key={key} className="rounded-[8px] border border-input-border bg-white flex flex-col overflow-hidden"
                                    onClick={() => onCardClick(m)} onMouseEnter={() => onCardHover(m)} onMouseLeave={onCardLeave}
                                    style={{ cursor: m.media_type === 'video' || m.media_type === 'audio' ? 'pointer' : 'default' }}>
                                    <div className="mx-3 mt-3 rounded-[6px] overflow-hidden bg-gray-50 relative">
                                      <ReferenceImage match={m} alt={m.title} loading="lazy" className="w-full h-[180px] object-cover" />
                                      <div className="absolute top-1.5 right-1.5"><CardMediaBadge mediaType={m.media_type} /></div>
                                    </div>
                                    <div className="mx-3"><SwatchStrip match={m} /></div>
                                    <div className="px-3 pt-2">
                                      <p className="text-[15px] font-semibold text-text-h1 leading-tight">{m.title}</p>
                                      <p className="text-[11px] text-[#8A8794] mt-0.5">{m.primary_tag}</p>
                                    </div>
                                    <div className="mx-3 mt-2 rounded-[6px] bg-[#F7F8FE] border border-[#E6EAFA] p-3 flex-1">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-color mb-1">Scene prompt</p>
                                      <p className="text-[13px] leading-[160%] text-[#3B3A45]">{m.description}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    {s.picks.map((m) => {
                      const key = `${s.id}-${m.reference_id}`;
                      return (
                        <div key={key} className="rounded-[8px] border border-input-border bg-white flex flex-col overflow-hidden"
                          onClick={() => onCardClick(m)} onMouseEnter={() => onCardHover(m)} onMouseLeave={onCardLeave}
                          style={{ cursor: m.media_type === 'video' || m.media_type === 'audio' ? 'pointer' : 'default' }}>
                          <div className="mx-3 mt-3 rounded-[6px] overflow-hidden bg-gray-50 relative">
                            <ReferenceImage
                              match={m}
                              alt={m.title}
                              loading="lazy"
                              className="w-full h-[180px] object-cover"
                            />
                            <div className="absolute top-1.5 right-1.5"><CardMediaBadge mediaType={m.media_type} /></div>
                          </div>
                          <div className="mx-3"><SwatchStrip match={m} /></div>
                          <div className="px-3 pt-2">
                            <p className="text-[15px] font-semibold text-text-h1 leading-tight">{m.title}</p>
                            <p className="text-[11px] text-[#8A8794] mt-0.5">{m.primary_tag}</p>
                          </div>
                          <div className="mx-3 mt-2 rounded-[6px] bg-[#F7F8FE] border border-[#E6EAFA] p-3 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-color mb-1">Scene prompt</p>
                            <p className="text-[13px] leading-[160%] text-[#3B3A45]">{m.description}</p>
                          </div>
                          <div className="px-3 pb-3 pt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMeta((p) => ({ ...p, [key]: !p[key] })); }}
                              className="flex items-center gap-1 text-[12px] text-brand-color font-medium cursor-pointer"
                            >
                              Why this matched
                              <span className={`transition-transform ${openMeta[key] ? 'rotate-180' : ''}`}>▾</span>
                            </button>
                            {openMeta[key] && <MetaPanel m={m} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Export */}
        {!loading && !error && (
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/export`, { state: { workspaceName, projectName } })}
            disabled={totalPicks === 0}
            className="mt-12 flex items-center justify-center w-[192px] h-[38px] px-6 bg-brand-color hover:bg-blue-700 disabled:opacity-40 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer"
          >
            Export
          </button>
        )}
      </main>

      <Footer />
      <MediaPlayerPopover match={activePopover} onClose={() => setActivePopover(null)} />
    </div>
  );
};

export default Preview;
