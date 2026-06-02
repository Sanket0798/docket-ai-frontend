import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const TOTAL_CREDITS = 100;
const CREDITS_PER_GENERATE = 1;

const AIQuestions = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const { toast } = useToast();

  const [projectName, setProjectName] = useState(location.state?.projectName || '');
  // List of every question generated so far for this project. Sequential —
  // the next one is only generated when the user advances to a brand-new index.
  const [questions, setQuestions] = useState([]); // [{ id, question_order, question, subtitle, thumbnails, selected_thumbnails, status }]
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(14);
  const [loading, setLoading] = useState(true);       // initial hydrate
  const [generating, setGenerating] = useState(false); // POST /questions/next in flight
  const [saving, setSaving] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const hydratedRef = useRef(false);

  // Hydrate project name if it wasn't handed over via nav state.
  useEffect(() => {
    if (projectName) return;
    api.get(`/projects/${projectId}`)
      .then(res => setProjectName(res.data.name || ''))
      .catch(console.error);
  }, [projectId]);

  // On mount: load all existing questions for this project. If none exist yet,
  // generate the first one. If some already exist, jump the user to the first
  // unanswered one (so they resume where they left off).
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    (async () => {
      try {
        const res = await api.get(`/projects/${projectId}/questions`);
        const list = res.data.questions || [];
        setTotalQuestions(res.data.total_questions || 14);

        if (list.length === 0) {
          await fetchNext([]);
        } else {
          setQuestions(list);
          const firstPending = list.findIndex(q => q.status !== 'answered');
          if (firstPending === -1 && list.length >= (res.data.total_questions || 14)) {
            // Everything answered — straight to preview.
            navigate(`/workspace/${workspaceId}/project/${projectId}/preview`,
              { state: { workspaceName } });
            return;
          }
          setCurrentIndex(firstPending === -1 ? list.length - 1 : firstPending);
        }
      } catch (err) {
        console.error('Failed to load questions:', err);
        toast('Failed to load questions. Please refresh.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const fetchNext = async (existingList) => {
    setGenerating(true);
    try {
      const res = await api.post(`/projects/${projectId}/questions/next`);
      if (res.data.done) {
        navigate(`/workspace/${workspaceId}/project/${projectId}/preview`,
          { state: { workspaceName } });
        return null;
      }
      const newQ = {
        id: res.data.id,
        question_order: res.data.question_order,
        question: res.data.question,
        subtitle: res.data.subtitle,
        thumbnails: res.data.thumbnails || [],
        selected_thumbnails: [],
        status: 'pending_answer',
      };
      setQuestions(prev => {
        const base = existingList ?? prev;
        const next = [...base, newQ];
        setCurrentIndex(next.length - 1);
        return next;
      });
      return newQ;
    } catch (err) {
      console.error('Failed to generate next question:', err);
      toast('Failed to generate the next question.', 'error');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const current = questions[currentIndex];
  const selectedIds = new Set(current?.selected_thumbnails || []);

  const toggleSelect = (thumbId) => {
    setQuestions(prev => {
      const next = [...prev];
      const q = { ...next[currentIndex] };
      const set = new Set(q.selected_thumbnails || []);
      if (set.has(thumbId)) set.delete(thumbId); else set.add(thumbId);
      q.selected_thumbnails = Array.from(set);
      next[currentIndex] = q;
      return next;
    });
  };

  const handleGenerateMore = () => {
    // Placeholder: in the real flow this asks the RAG layer for more
    // candidate thumbnails for the *current* question, not a new question.
    if (creditsUsed >= TOTAL_CREDITS) {
      toast('No credits remaining', 'warning');
      return;
    }
    setCreditsUsed(prev => prev + CREDITS_PER_GENERATE);
    toast('More thumbnails will be available once AI generation is wired up.', 'info');
  };

  const handleNext = async () => {
    if (!current) return;
    if (selectedIds.size === 0) {
      toast('Please select at least one option before continuing.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/questions`, {
        question: current.question,
        question_order: current.question_order,
        answer: Array.from(selectedIds).join(','),
        selected_thumbnails: Array.from(selectedIds),
      });
      // Mark locally as answered so navigating back shows the correct state.
      setQuestions(prev => {
        const next = [...prev];
        next[currentIndex] = { ...next[currentIndex], status: 'answered' };
        return next;
      });
    } catch (err) {
      console.error('Failed to save selection:', err);
      toast('Failed to save your selection. Please try again.', 'error');
      setSaving(false);
      return;
    } finally {
      setSaving(false);
    }

    // If we're already showing a previously-generated question, just advance the pointer.
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return;
    }
    // Otherwise generate the next one (or navigate to preview when done).
    if (questions.length >= totalQuestions) {
      navigate(`/workspace/${workspaceId}/project/${projectId}/preview`,
        { state: { workspaceName } });
      return;
    }
    await fetchNext();
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 lg:px-[60px] py-[51px]">
          <div className="space-y-3 max-w-[680px]">
            <div className="h-6 bg-gray-200 rounded-full animate-pulse w-2/3" />
            <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/2" />
            <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/5 mt-8" />
            <div className="h-3 bg-gray-100 rounded-full animate-pulse w-2/5" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!current) {
    // Generating the first question
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-brand-color border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#4A4755]">Generating your first question…</p>
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
        <div className="flex items-center gap-2 mb-9">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/editor`,
              { state: { workspaceName } })}
            className="cursor-pointer"
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <span className="text-text-h1 text-[22px] lg:text-[34px] leading-12 font-medium truncate">{workspaceName} /</span>
          <span className="font-light text-[18px] lg:text-[30px] leading-10 text-[#A7A7A7] truncate">
            {projectName || '...'}
          </span>
        </div>

        {/* Question heading */}
        <div className="mb-8">
          <h1 className="font-medium text-[22px] lg:text-[34px] leading-[48px] text-text-h1 mb-2">
            {current.question}
          </h1>
          <p className="font-normal text-base lg:text-lg leading-[130%] text-[#5D586C]">
            {current.subtitle || `Question ${current.question_order} of ${totalQuestions}`}
          </p>
        </div>

        {/* Thumbnail grid */}
        <div className="mb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-8 max-w-[1321px] mx-auto">
            {(current.thumbnails || []).map((thumb) => {
              const isSelected = selectedIds.has(thumb.id);
              return (
                <button
                  key={thumb.id}
                  onClick={() => toggleSelect(thumb.id)}
                  className={`relative rounded-[6px] overflow-hidden border-2 transition-all
                    ${isSelected ? 'border-[#4285F4] border-[5px] rounded-[3px]' : 'border-transparent'}`}
                >
                  <img src={thumb.url} alt="" />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-11 h-[34px] rounded-[10px] bg-white flex items-center justify-center shadow-md">
                      <img src="/assets/icons/seleted-tick.svg" alt="" />
                    </div>
                  )}
                </button>
              );
            })}

            {generating && (
              <div className="h-[160px] rounded-[6px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <img src="/assets/icons/question-loading-spin.svg" alt="" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar — credits + generate more (left) | navigation (right) */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 mt-8">
          <div className="flex flex-col gap-4">
            <p className="font-medium text-base leading-7 text-brand-color">
              {creditsUsed} credits used out of {TOTAL_CREDITS} credits
            </p>
            <button
              onClick={handleGenerateMore}
              disabled={generating || creditsUsed >= TOTAL_CREDITS}
              className="flex items-center justify-center gap-2 w-[192px] h-[38px] px-5 bg-brand-color hover:bg-blue-700 disabled:opacity-50 text-white text-[15px] font-medium rounded-[6px] transition self-start"
            >
              {generating && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Generate more
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
              disabled={saving || generating}
              className="flex items-center gap-2 h-[38px] px-5 border border-brand-color text-gray-600 text-[15px] font-medium rounded-[10px] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-brand-color border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {current.question_order >= totalQuestions ? 'Save & finish' : 'Save & next'}
                  <img src="/assets/icons/right-arrow.svg" alt="" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIQuestions;
