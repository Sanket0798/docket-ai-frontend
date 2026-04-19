import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

// Questions — AI will generate images per option in future
const QUESTIONS = [
  {
    id: 'lighting',
    question: 'What lighting tone fits this scene?',
    subtitle: 'Lighting influences the visual mood and depth of your scene',
  },
  {
    id: 'mood',
    question: 'What mood should the video convey?',
    subtitle: 'The emotional tone shapes how your audience connects with the content',
  },
  {
    id: 'pace',
    question: 'What should the video pacing feel like?',
    subtitle: 'Pacing controls the rhythm and energy of your final video',
  },
  {
    id: 'color_grade',
    question: 'What color grading style do you prefer?',
    subtitle: 'Color grading sets the overall visual aesthetic of your video',
  },
];

// Generate placeholder image cards per question (8 initial)
const INITIAL_COUNT = 8;
const GENERATE_MORE_COUNT = 4;
const CREDITS_PER_GENERATE = 1;
const TOTAL_CREDITS = 100;

// Placeholder gradient colors per question for visual variety
const CARD_GRADIENTS = [
  'from-yellow-200 via-orange-300 to-purple-400',
  'from-orange-200 via-yellow-300 to-green-300',
  'from-purple-200 via-blue-300 to-orange-300',
  'from-yellow-300 via-orange-200 to-teal-300',
];

const AIQuestions = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const resumeStep = location.state?.resumeStep ?? 0;
  const { toast } = useToast();

  const [projectName, setProjectName] = useState(location.state?.projectName || '');

  // Fetch project name if not passed via navigation state
  useEffect(() => {
    if (projectName) return;
    api.get(`/projects/${projectId}`)
      .then(res => setProjectName(res.data.name || ''))
      .catch(console.error);
  }, [projectId]);

  const [currentStep, setCurrentStep] = useState(resumeStep);
  const [answers, setAnswers] = useState({});       // { questionId: Set of selected indices }
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);     // initial skeleton load
  const [generating, setGenerating] = useState(false); // generate more loading
  const [cardCounts, setCardCounts] = useState(
    Object.fromEntries(QUESTIONS.map(q => [q.id, INITIAL_COUNT]))
  );
  const [creditsUsed, setCreditsUsed] = useState(0);

  const question = QUESTIONS[currentStep];
  const totalSteps = QUESTIONS.length;
  const selectedSet = answers[question.id] || new Set();
  const cardCount = cardCounts[question.id];

  // Simulate initial AI generation loading
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, [currentStep]);

  const toggleSelect = (index) => {
    setAnswers(prev => {
      const current = new Set(prev[question.id] || []);
      if (current.has(index)) {
        current.delete(index);
      } else {
        current.add(index);
      }
      return { ...prev, [question.id]: current };
    });
  };

  const handleGenerateMore = () => {
    if (creditsUsed >= TOTAL_CREDITS) {
      toast('No credits remaining', 'warning');
      return;
    }
    setGenerating(true);
    setCreditsUsed(prev => prev + CREDITS_PER_GENERATE);
    setTimeout(() => {
      setCardCounts(prev => ({
        ...prev,
        [question.id]: prev[question.id] + GENERATE_MORE_COUNT,
      }));
      setGenerating(false);
    }, 1500);
  };

  const handleNext = async () => {
    // Require at least one selection before proceeding
    if (selectedSet.size === 0) {
      toast('Please select at least one option before continuing.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const selectedIndices = Array.from(selectedSet);
      await api.post(`/projects/${projectId}/questions`, {
        question: question.question,
        answer: selectedIndices.join(','),
        question_order: currentStep,
      });
    } catch (err) {
      console.error(err);
      toast('Failed to save your selection. Please try again.', 'error');
      setSaving(false);
      return;
    } finally {
      setSaving(false);
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      navigate(`/workspace/${workspaceId}/project/${projectId}/preview`,
        { state: { workspaceName, answers } });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const gradient = CARD_GRADIENTS[currentStep % CARD_GRADIENTS.length];

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
            {question.question}
          </h1>
          <p className="font-normal text-base lg:text-lg leading-[130%] text-[#5D586C]">{question.subtitle}</p>
        </div>

        {/* Image grid */}
        {loading ? (
          /* Skeleton loader — thin horizontal bars matching Figma */
          <div className="mb-10 space-y-8">
            {/* Group 1 — 4 bars */}
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[95%]" />
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[78%]" />
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[92%]" />
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[55%]" />
            </div>
            {/* Group 2 — 5 bars */}
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[93%]" />
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[70%]" />
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[88%]" />
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[80%]" />
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-[65%]" />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-8 max-w-[1321px] mx-auto">
              {Array.from({ length: cardCount }).map((_, i) => {
                const isSelected = selectedSet.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`relative rounded-[6px] overflow-hidden border-2 transition-all
                      ${isSelected ? 'border-[#4285F4] border-[5px] rounded-[3px]' : 'border-transparent'}`}
                  >
                    {/* Placeholder image — gradient background */}
                    {/* <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-80`} /> */}
                    <img src="/assets/project/AI-Image.jpg" alt="" className='' />

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-11 h-[34px] rounded-[10px] bg-white flex items-center justify-center shadow-md">
                        <img src="/assets/icons/seleted-tick.svg" alt="" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Generating spinner card */}
              {generating && (
                <div className="h-[160px] rounded-[6px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    {/* Figma-style spinner */}
                    {/* <div className="relative w-10 h-10">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-0.5 h-2.5 bg-brand-color rounded-full"
                          style={{
                            top: '50%',
                            left: '50%',
                            transformOrigin: '0 16px',
                            transform: `rotate(${i * 45}deg) translateX(-50%)`,
                            opacity: 0.2 + i * 0.1,
                          }}
                        />
                      ))}
                    </div> */}
                    <img src="/assets/icons/question-loading-spin.svg" alt="" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom bar — credits + generate more (left) | navigation (right) */}
        {!loading && (
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 mt-8">
            {/* Left — credits + generate more */}
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

            {/* Right — prev / next */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-2 h-[38px] px-5 border border-brand-color text-gray-600 text-[15px] font-medium rounded-[10px] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <img src="/assets/icons/left-arrow.svg" alt="" />
                Previous question
              </button>

              <button
                onClick={handleNext}
                disabled={saving}
                className="flex items-center gap-2 h-[38px] px-5 border border-brand-color text-gray-600 text-[15px] font-medium rounded-[10px] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {currentStep === totalSteps - 1 ? 'Save & finish' : 'Save & next'}
                    <img src="/assets/icons/right-arrow.svg" alt="" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AIQuestions;
