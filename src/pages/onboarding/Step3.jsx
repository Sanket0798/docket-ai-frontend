import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const aiOptions = [
  { id: 'generating_scenes', label: 'Generating scenes from script' },
  { id: 'visual_references', label: 'Suggesting visual references' },
  { id: 'storytelling', label: 'Improving storytelling' },
  { id: 'camera_shots', label: 'Camera & shot suggestions' },
  { id: 'mood_lighting', label: 'Improving Mood & lighting ideas' },
];

const Step3 = () => {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [selected, setSelected] = useState(
    () => sessionStorage.getItem('ob_ai_assistance') || ''
  );
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post('/onboarding', {
        project_type: sessionStorage.getItem('ob_project_type'),
        scenes_elements: sessionStorage.getItem('ob_scenes'),
        ai_assistance: selected,
        completed: true,
      });
      sessionStorage.removeItem('ob_project_type');
      sessionStorage.removeItem('ob_scenes');
      sessionStorage.removeItem('ob_ai_assistance');
      completeOnboarding();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      completeOnboarding();
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate('/onboarding/step2');

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-10 lg:py-[192px]">
      {/* Progress bar */}
      <div className="w-full max-w-[700px] flex mb-5">
        <div className="h-2 flex-1 bg-brand-text" />
        <div className="h-2 flex-1 bg-brand-text" />
        <div className="h-2 flex-1 bg-brand-text" />
      </div>

      {/* Heading */}
      <div className="w-full max-w-[700px] mb-14">
        <h1 className="font-medium text-[20px] lg:text-[25px] leading-9 text-text-h1">
          What would you like AI to help you with the most?
        </h1>
        <p className="font-normal leading-[22px] text-[15px] text-text-h2">
          Choose where you want the most assistance in your workflow
        </p>
      </div>

      {/* Cards grid — 1 col on mobile, 2 cols on sm+ */}
      <div className="w-full max-w-[700px] grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {aiOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            className={`flex items-center justify-center px-5 h-[56px] rounded-[5px] border transition-all text-center
              ${selected === opt.id
                ? 'border-brand-text bg-indigo-50'
                : 'border-[#C3C3C3] bg-white hover:border-indigo-300 hover:bg-gray-50'
              }`}
          >
            <span className={`font-medium text-[15px] ${selected === opt.id ? 'text-indigo-700' : 'text-text-h1 font-medium text-2xl leading-[32px]'}`}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-[700px] flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 h-[38px] px-5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <button
          onClick={handleFinish}
          disabled={!selected || loading}
          className={`px-8 h-[38px] bg-button-color text-white cursor-pointer text-sm font-semibold rounded-lg transition flex items-center gap-2 hover:opacity-65 ${selected ? 'opacity-100 hover:opacity-100' : 'opacity-65'} disabled:cursor-not-allowed`}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin cursor-pointer" />
          ) : (
            <>
              Finish
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Step3;
