import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

// Maps the option a director picks (A/B/C/D) onto the PersonalityRequest shape
// the backend scores. We send only the answers — the backend attaches the user
// id and owns the quadrant arithmetic.
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 90; // ~3 min ceiling — the live LLM synthesis can take ~50s+

// Quadrant tag → full name, for the rare case the backend hands back a tag.
const QUADRANT_NAMES = {
  AA: 'Aura of the Auteur',
  AR: 'Avant-Garde Rebel',
  BM: 'Blueprint Max',
  KC: 'Kinetic Catalyst',
};
const quadrantLabel = (q) => QUADRANT_NAMES[q] || q || '';

const PersonalityQuestions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});      // { [question_id]: 'A'|'B'|'C'|'D' }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // POST + polling in flight
  const [profile, setProfile] = useState(null);        // completed job result

  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/personality/questions');
        if (cancelled) return;
        setQuestions(res.data.questions || []);
      } catch (err) {
        console.error('Failed to load profiling questions:', err);
        toast('Failed to load the profiling questions. Please refresh.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const total = questions.length;
  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = total > 0 && answeredCount === total;
  const isLast = currentIndex === total - 1;

  const choose = (questionId, optionKey) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (!answers[current.id]) {
      toast('Please pick the option that sounds most like you.', 'warning');
      return;
    }
    if (!isLast) setCurrentIndex((i) => i + 1);
  };

  const pollStatus = (jobId, attempt = 0) => {
    if (attempt >= MAX_POLLS) {
      setSubmitting(false);
      toast('Profiling is taking longer than expected. Please try again.', 'error');
      return;
    }
    pollRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/personality/status/${jobId}`);
        const { status, result } = res.data;
        if (status === 'completed' && result) {
          setProfile(result);
          setSubmitting(false);
        } else if (status === 'error' || status === 'failed') {
          setSubmitting(false);
          toast(result?.error || 'Profiling failed. Please try again.', 'error');
        } else {
          pollStatus(jobId, attempt + 1);
        }
      } catch (err) {
        console.error('Failed to poll profiling status:', err);
        pollStatus(jobId, attempt + 1);
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast('Please answer all questions before continuing.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const responses = questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id],
      }));
      const res = await api.post('/personality', { responses });
      const jobId = res.data.job_id;
      if (!jobId) throw new Error('No job id returned');
      pollStatus(jobId);
    } catch (err) {
      console.error('Failed to submit profiling answers:', err);
      setSubmitting(false);
      toast('Could not start profiling. Please try again.', 'error');
    }
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-button-color border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-h2">Loading your profiling questions…</p>
        </div>
      </div>
    );
  }

  // ── Submitting / scoring ─────────────────────────────────────────
  if (submitting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 max-w-[420px] text-center px-6">
          <div className="w-12 h-12 border-4 border-button-color border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-medium text-text-h1">Building your Director Profile…</p>
          <p className="text-sm text-text-h2">
            We're scoring your answers and stitching together your profile. This takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  // ── Result ───────────────────────────────────────────────────────
  if (profile) {
    return <ProfileResult profile={profile} onDone={() => navigate('/dashboard')} />;
  }

  // ── Questionnaire (stepper) ──────────────────────────────────────
  if (!current) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-text-h2">No questions available.</p>
      </div>
    );
  }

  const progressPct = Math.round(((currentIndex + 1) / total) * 100);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-10 lg:py-[120px]">
      <div className="w-full max-w-[700px]">
        {/* Progress */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium text-button-color">
            Question {currentIndex + 1} of {total}
          </span>
          <span className="text-[13px] text-text-h2">{answeredCount}/{total} answered</span>
        </div>
        <div className="w-full h-2 bg-[#E9E9EE] rounded-full mb-10 overflow-hidden">
          <div
            className="h-2 bg-button-color rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Category + question */}
        <p className="text-[13px] font-medium uppercase tracking-wide text-button-color mb-2">
          {current.category}
        </p>
        <h1 className="font-medium text-[20px] lg:text-[25px] leading-9 text-text-h1 mb-8">
          {current.text}
        </h1>

        {/* Options */}
        <div className="flex flex-col gap-3 mb-10">
          {current.options.map((opt) => {
            const selected = answers[current.id] === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => choose(current.id, opt.key)}
                className={`flex items-start gap-3 text-left px-5 py-4 rounded-[8px] border transition-all
                  ${selected
                    ? 'border-brand-text bg-indigo-50'
                    : 'border-[#C3C3C3] bg-white hover:border-indigo-300 hover:bg-gray-50'
                  }`}
              >
                <span
                  className={`shrink-0 w-6 h-6 mt-0.5 rounded-full border flex items-center justify-center text-[12px] font-semibold
                    ${selected ? 'border-brand-text bg-brand-text text-white' : 'border-[#C3C3C3] text-text-h2'}`}
                >
                  {opt.key}
                </span>
                <span className={`text-[15px] leading-[22px] ${selected ? 'text-indigo-700 font-medium' : 'text-text-h1'}`}>
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 h-[38px] px-5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className={`px-8 h-[38px] bg-button-color text-white text-sm font-semibold rounded-lg transition hover:opacity-90 ${allAnswered ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}
            >
              See my profile
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 h-[38px] bg-button-color text-white text-sm font-semibold rounded-lg transition hover:opacity-90"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Director Profile result view ───────────────────────────────────
const ProfileResult = ({ profile, onDone }) => {
  const ps = profile.profile_summary || {};
  const fields = [
    ['Core want', ps.core_want],
    ['Briefing language', ps.briefing_language],
    ['Visual logic', ps.visual_logic],
    ['Audio logic', ps.audio_logic],
    ['Performance direction', ps.performance_direction],
    ['Best success outcome', ps.success_outcome],
    ['Failure mode', ps.failure_mode],
    ['Business translation', ps.business_translation],
    ['Tensions', ps.tensions],
  ].filter(([, v]) => v);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-10 lg:py-[80px]">
      <div className="w-full max-w-[760px]">
        <p className="text-[13px] font-medium uppercase tracking-wide text-button-color mb-2">
          Your Director Profile
        </p>
        <h1 className="font-medium text-[24px] lg:text-[32px] leading-tight text-text-h1 mb-1">
          {profile.primary_profile}
          {profile.primary_type ? <span className="text-text-h2 font-normal"> · {profile.primary_type}</span> : null}
        </h1>
        <p className="text-[15px] text-text-h2 mb-6">
          {quadrantLabel(profile.primary_quadrant)}
          {profile.secondary_profile ? ` · secondary lean toward ${profile.secondary_profile}` : ''}
        </p>

        {/* Letter counts */}
        {profile.letter_counts && (
          <div className="flex flex-wrap gap-3 mb-8">
            {Object.entries(profile.letter_counts).map(([tag, count]) => (
              <div key={tag} className="px-4 py-2 rounded-[8px] bg-indigo-50 border border-indigo-100">
                <span className="text-[12px] font-semibold text-indigo-700">{tag}</span>
                <span className="text-[12px] text-text-h2"> · {quadrantLabel(tag)}</span>
                <span className="ml-2 text-[14px] font-semibold text-text-h1">{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Profile fields */}
        <div className="flex flex-col gap-5 mb-8">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-button-color mb-1">{label}</p>
              <p className="text-[15px] leading-[22px] text-text-h1">{value}</p>
            </div>
          ))}
        </div>

        {/* Words */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {Array.isArray(ps.words_that_work) && ps.words_that_work.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-green-700 mb-2">Words that work</p>
              <div className="flex flex-wrap gap-2">
                {ps.words_that_work.map((w) => (
                  <span key={w} className="px-3 py-1 rounded-full bg-green-50 border border-green-100 text-[13px] text-green-800">{w}</span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(ps.words_to_avoid) && ps.words_to_avoid.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-red-700 mb-2">Words to avoid</p>
              <div className="flex flex-wrap gap-2">
                {ps.words_to_avoid.map((w) => (
                  <span key={w} className="px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[13px] text-red-800">{w}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onDone}
          className="px-8 h-[42px] bg-button-color text-white text-sm font-semibold rounded-lg transition hover:opacity-90"
        >
          Continue to dashboard
        </button>
      </div>
    </div>
  );
};

export default PersonalityQuestions;
