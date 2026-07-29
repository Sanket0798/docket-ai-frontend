import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MediaBadge, MediaBadgeInline, SwatchStrip } from '../../components/referenceMedia';

const PAGE_SIZE = 10;
const fmt = (n) => (typeof n === 'number' ? n.toFixed(3) : '—');

// The selection flow: all 14 creative-parameter questions, each backed by the
// deep-ranked reference matches from the RAG pipeline (stored per question in
// thumbnails = { name, intent, matches }). The card-mode toggle switches
// between a compact image grid and the detailed matched card — both selectable.
const AIQuestions = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const { toast } = useToast();

  const [projectName, setProjectName] = useState(location.state?.projectName || '');
  const [questions, setQuestions] = useState([]);   // rows from GET /questions
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [prepping, setPrepping] = useState(false);  // first-time scene compute in flight
  const [saving, setSaving] = useState(false);
  const [cardMode, setCardMode] = useState('simple'); // 'simple' | 'detailed'
  const [visible, setVisible] = useState({});       // question_order -> count shown
  const [openMeta, setOpenMeta] = useState({});     // matchKey -> bool (detailed card meta)
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (projectName) return;
    api.get(`/projects/${projectId}`)
      .then(res => setProjectName(res.data.name || ''))
      .catch(console.error);
  }, [projectId]);

  // A prepped row carries { name, intent, matches } in thumbnails; the legacy
  // dummy rows carried a plain array — treat those as stale and re-prep.
  const isPrepped = (rows) =>
    rows.length > 0 && rows.every(q => q.thumbnails && Array.isArray(q.thumbnails.matches));

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    (async () => {
      try {
        let res = await api.get(`/projects/${projectId}/questions`);
        let list = res.data.questions || [];

        if (!isPrepped(list)) {
          setPrepping(true);
          await api.post(`/projects/${projectId}/questions/prep?refresh=1`);
          res = await api.get(`/projects/${projectId}/questions`);
          list = res.data.questions || [];
          setPrepping(false);
        }

        setQuestions(list);
        const firstPending = list.findIndex(q => q.status !== 'answered');
        setCurrentIndex(firstPending === -1 ? 0 : firstPending);
      } catch (err) {
        console.error('Failed to load questions:', err);
        toast(err.response?.data?.message || 'Failed to load questions. Please refresh.', 'error');
        setPrepping(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const current = questions[currentIndex];
  const meta = current?.thumbnails || {};
  const matches = meta.matches || [];
  const shown = visible[currentIndex] ?? PAGE_SIZE;
  const selectedIds = new Set(current?.selected_thumbnails || []);
  const totalQuestions = questions.length || 14;
  const totalSelected = questions.reduce((n, q) => n + (q.selected_thumbnails?.length || 0), 0);

  const toggleSelect = (refId) => {
    setQuestions(prev => {
      const next = [...prev];
      const q = { ...next[currentIndex] };
      const set = new Set(q.selected_thumbnails || []);
      if (set.has(refId)) set.delete(refId); else set.add(refId);
      q.selected_thumbnails = Array.from(set);
      next[currentIndex] = q;
      return next;
    });
  };

  const saveCurrent = async () => {
    if (!current) return false;
    try {
      await api.post(`/projects/${projectId}/questions`, {
        question: current.question,
        question_order: current.question_order,
        answer: Array.from(selectedIds).join(','),
        selected_thumbnails: Array.from(selectedIds),
      });
      setQuestions(prev => {
        const next = [...prev];
        next[currentIndex] = { ...next[currentIndex], status: 'answered' };
        return next;
      });
      return true;
    } catch (err) {
      console.error('Failed to save selection:', err);
      toast('Failed to save your selection. Please try again.', 'error');
      return false;
    }
  };

  const handleNext = async () => {
    if (selectedIds.size === 0) {
      toast('Please select at least one reference before continuing.', 'warning');
      return;
    }
    setSaving(true);
    const ok = await saveCurrent();
    setSaving(false);
    if (!ok) return;

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      window.scrollTo({ top: 0 });
    } else {
      navigate(`/workspace/${workspaceId}/project/${projectId}/preview`, { state: { workspaceName } });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) { setCurrentIndex(prev => prev - 1); window.scrollTo({ top: 0 }); }
  };

  const loadMore = () => setVisible(prev => ({ ...prev, [currentIndex]: shown + PAGE_SIZE }));

  // ── Simple selectable image tile ─────────────────────────────────────
  const SimpleCard = ({ m }) => {
    const isSelected = selectedIds.has(m.reference_id);
    return (
      <button
        onClick={() => toggleSelect(m.reference_id)}
        className={`relative rounded-[6px] overflow-hidden border-2 transition-all text-left bg-gray-50
          ${isSelected ? 'border-[#4285F4] border-[4px] rounded-[3px]' : 'border-transparent hover:border-gray-200'}`}
      >
        <img
          src={m.thumbnail_url || '/assets/project/AI-Image.jpg'}
          alt={m.title}
          loading="lazy"
          className="w-full h-[150px] object-cover"
        />
        <SwatchStrip src={m.thumbnail_url} />
        <div className="px-2 py-1.5">
          <p className="text-[12px] font-medium text-text-h1 truncate">{m.title}</p>
          <p className="text-[10px] text-[#8A8794]">score {fmt(m.score)}{m.below_gate ? ' · weak match' : ''}</p>
        </div>
        {isSelected && (
          <div className="absolute top-2 right-2 w-9 h-7 rounded-[8px] bg-white flex items-center justify-center shadow-md">
            <img src="/assets/icons/seleted-tick.svg" alt="" />
          </div>
        )}
        {m.below_gate && !isSelected && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">weak</span>
        )}
      </button>
    );
  };

  // ── Detailed selectable matched card ─────────────────────────────────
  const DetailedCard = ({ m, mi }) => {
    const isSelected = selectedIds.has(m.reference_id);
    const key = `${currentIndex}-${m.reference_id}`;
    return (
      <div
        onClick={() => toggleSelect(m.reference_id)}
        className={`relative rounded-[8px] border bg-white flex flex-col overflow-hidden cursor-pointer transition-all
          ${isSelected ? 'border-[#4285F4] ring-2 ring-[#4285F4]' : 'border-input-border hover:border-gray-300'}`}
      >
        {isSelected && (
          <div className="absolute top-3 right-3 z-10 w-9 h-7 rounded-[8px] bg-white flex items-center justify-center shadow-md">
            <img src="/assets/icons/seleted-tick.svg" alt="" />
          </div>
        )}
        <div className="flex items-center justify-between px-3 pt-3">
          <span className="px-2 py-0.5 rounded-[4px] bg-brand-color text-white text-[11px] font-medium">#{mi + 1} · {fmt(m.score)}</span>
          {m.below_gate && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium mr-10">weak match</span>
          )}
        </div>
        <div className="px-3 pt-2">
          <p className="text-[15px] font-semibold text-text-h1 leading-tight">{m.title}</p>
          <p className="text-[11px] text-[#8A8794] mt-0.5">{m.primary_tag}</p>
          <div className="mt-1"><MediaBadgeInline param={meta.name} /></div>
        </div>
        <div className="mx-3 mt-2 rounded-[6px] overflow-hidden bg-gray-50">
          <img
            src={m.thumbnail_url || '/assets/project/AI-Image.jpg'}
            alt={m.title}
            loading="lazy"
            className="w-full h-[180px] object-cover"
          />
        </div>
        <div className="mx-3"><SwatchStrip src={m.thumbnail_url} /></div>
        <div className="mx-3 mt-2 rounded-[6px] bg-[#F7F8FE] border border-[#E6EAFA] p-3 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-color mb-1">Scene prompt</p>
          <p className="text-[13px] leading-[160%] text-[#3B3A45]">{m.description}</p>
        </div>
        <div className="px-3 pb-3 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMeta(p => ({ ...p, [key]: !p[key] })); }}
            className="flex items-center gap-1 text-[12px] text-brand-color font-medium cursor-pointer"
          >
            Why this matched
            <span className={`transition-transform ${openMeta[key] ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {openMeta[key] && (
            <div className="mt-2 text-[12px] leading-[18px] text-[#4A4755] bg-[#F4F6FF] border border-[#D9E1FF] rounded-[6px] p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {(m.tags || []).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-white border border-[#D9E1FF] text-[11px] text-[#3B3A45]">{t}</span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span>Final score</span><span className="text-right font-medium text-text-h1">{fmt(m.score)}</span>
                <span>Match similarity</span><span className="text-right">{fmt(m.cosine_score)}</span>
                <span>Parameter match</span><span className="text-right">{fmt(m.param_cosine)}</span>
                <span>Scene-content match</span><span className="text-right">{fmt(m.content_cosine)}</span>
                <span>Quadrant match</span>
                <span className="text-right">{m.quadrant_match ? `✓ ${m.quadrant_affinity}` : '—'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading || prepping) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 border-4 border-brand-color border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#4A4755]">
              {prepping
                ? 'Reading your script, searching the reference bank and ranking matches for all 14 questions…'
                : 'Loading your questions…'}
            </p>
            {prepping && <p className="text-xs text-[#8A8794]">This runs once per script and takes ~15 seconds.</p>}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-[#4A4755]">No questions could be prepared — make sure a script is uploaded.</p>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/editor`, { state: { workspaceName } })}
              className="px-5 h-[38px] bg-brand-color text-white text-[14px] font-medium rounded-[6px] cursor-pointer"
            >
              Back to script
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] py-[51px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/editor`, { state: { workspaceName } })}
            className="cursor-pointer"
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <span className="text-text-h1 text-[22px] lg:text-[34px] leading-12 font-medium truncate">{workspaceName} /</span>
          <span className="font-light text-[18px] lg:text-[30px] leading-10 text-[#A7A7A7] truncate">{projectName || '...'}</span>
        </div>

        {/* Progress + card-mode toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[13px] font-medium">
              Question {current.question_order} of {totalQuestions}
            </span>
            <div className="flex items-center gap-1">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => { setCurrentIndex(i); window.scrollTo({ top: 0 }); }}
                  title={q.question}
                  className={`w-2.5 h-2.5 rounded-full transition cursor-pointer
                    ${i === currentIndex ? 'bg-brand-color scale-125'
                      : (q.selected_thumbnails?.length || 0) > 0 ? 'bg-green-400' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <span className="text-[12px] text-[#8A8794]">{totalSelected} selected so far</span>
          </div>

          {/* Card-mode toggle */}
          <div className="flex items-center rounded-[8px] border border-input-border overflow-hidden self-start">
            {[{ id: 'simple', label: 'Simple cards' }, { id: 'detailed', label: 'Detailed cards' }].map(t => (
              <button
                key={t.id}
                onClick={() => setCardMode(t.id)}
                className={`px-4 h-[34px] text-[13px] font-medium transition cursor-pointer
                  ${cardMode === t.id ? 'bg-brand-color text-white' : 'bg-white text-[#5D586C] hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question heading */}
        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="font-medium text-[22px] lg:text-[34px] leading-[44px] text-text-h1 capitalize">
              {current.question}
            </h1>
            <MediaBadge param={meta.name} />
          </div>
          {meta.intent && (
            <p className="font-normal text-sm lg:text-base leading-[150%] text-[#5D586C]">
              <span className="font-medium text-[#3B3A45]">What the AI searched for: </span>{meta.intent}
            </p>
          )}
        </div>

        {/* Matches grid */}
        {cardMode === 'simple' ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {matches.slice(0, shown).map((m) => <SimpleCard key={m.reference_id} m={m} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {matches.slice(0, shown).map((m, mi) => <DetailedCard key={m.reference_id} m={m} mi={mi} />)}
          </div>
        )}

        {/* Load more */}
        <div className="flex items-center gap-4 mt-6">
          {shown < matches.length ? (
            <button
              onClick={loadMore}
              className="flex items-center justify-center gap-2 h-[38px] px-5 bg-brand-color hover:bg-blue-700 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer"
            >
              Load more matches
            </button>
          ) : (
            <span className="text-[13px] text-[#8A8794]">All ranked matches shown.</span>
          )}
          <span className="text-[13px] text-[#8A8794]">
            Showing {Math.min(shown, matches.length)} of {matches.length} ranked matches · {selectedIds.size} selected
          </span>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap items-center justify-end gap-3 mt-10">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 h-[38px] px-5 border border-brand-color text-gray-600 text-[15px] font-medium rounded-[10px] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <img src="/assets/icons/left-arrow.svg" alt="" />
            Previous question
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-2 h-[38px] px-5 bg-brand-color text-white text-[15px] font-medium rounded-[10px] hover:bg-blue-700 disabled:opacity-40 transition cursor-pointer"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {current.question_order >= totalQuestions ? 'Save & preview' : 'Save & next'}
                <img src="/assets/icons/right-arrow.svg" alt="" className="brightness-0 invert" />
              </>
            )}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIQuestions;
