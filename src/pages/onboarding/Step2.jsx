import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Step2 = () => {
  const navigate = useNavigate();
  const [text, setText] = useState(
    () => sessionStorage.getItem('ob_scenes') || ''
  );

  const handleNext = () => {
    if (!text.trim()) return;
    sessionStorage.setItem('ob_scenes', text);
    navigate('/onboarding/step3');
  };

  const handleBack = () => navigate('/onboarding/step1');

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-10 lg:py-[192px]">
      {/* Progress bar */}
      <div className="w-full max-w-[700px] flex mb-5">
        <div className="h-2 flex-1 bg-brand-text" />
        <div className="h-2 flex-1 bg-brand-text" />
        <div className="h-2 flex-1 bg-[#D9D9D9]" />
      </div>

      {/* Heading */}
      <div className="w-full max-w-[700px] mb-8">
        <h1 className="font-medium text-[20px] lg:text-[25px] leading-9 text-text-h1">
          What kind of scenes or elements do you want to include?
        </h1>
        <p className="font-normal leading-[22px] text-[15px] text-text-h2">
          Mention any specific ideas, moods, or elements you'd like to see in your videos
        </p>
      </div>

      {/* Text area */}
      <div className="w-full max-w-[700px] mb-8">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Cinematic outdoor shots at golden hour, close-up product reveals, upbeat background music, text overlays with key stats..."
          rows={8}
          className="w-full px-3.5 py-2 border border-input-border rounded-[6px] text-sm text-gray-900 placeholder-[#B4B3B9] placeholder:font-normal placeholder:text-[15px] placeholder:leading-[24px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none leading-relaxed"
        />
        <p className="text-xs text-gray-400 mt-1.5 text-right">{text.length} characters</p>
      </div>

      {/* Navigation */}
      <div className="w-full max-w-[700px] flex items-center justify-between">
        <button
          onClick={handleBack}
          className="px-6 h-[38px] border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous question
        </button>
        <button
          onClick={handleNext}
          disabled={!text.trim()}
          className="w-[137px] h-[38px] bg-button-color text-white text-[15px] leading-[18px] cursor-pointer font-medium rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed text-sm transition flex items-center justify-center gap-2"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Step2;
