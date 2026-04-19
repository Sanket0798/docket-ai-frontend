import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const projectTypes = [
  { id: 'short_film', label: 'Short Film' },
  { id: 'music_video', label: 'Music Video' },
  { id: 'media_content', label: 'Media Content' },
  { id: 'advertisement', label: 'Advertisement' },
  { id: 'just_exploring', label: 'Just Exploring Ideas' },
];

const Step1 = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(
    () => sessionStorage.getItem('ob_project_type') || ''
  );

  const handleNext = () => {
    if (!selected) return;
    sessionStorage.setItem('ob_project_type', selected);
    navigate('/onboarding/step2');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-10 lg:py-[192px]">
      {/* Progress bar */}
      <div className="w-full max-w-[700px] flex mb-5">
        <div className="h-2 flex-1 bg-brand-text" />
        <div className="h-2 flex-1 bg-[#D9D9D9]" />
        <div className="h-2 flex-1 bg-[#D9D9D9]" />
      </div>

      {/* Heading */}
      <div className="w-full max-w-[700px] mb-14">
        <h1 className="font-medium text-[20px] lg:text-[25px] leading-9 text-text-h1">
          What kind of project are you planning to create right now?
        </h1>
        <p className="font-normal leading-[22px] text-[15px] text-text-h2">
          Tell us about your current project so we can guide you better
        </p>
      </div>

      {/* Cards grid — 1 col on mobile, 2 cols on sm+ */}
      <div className="w-full max-w-[700px] grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {projectTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelected(type.id)}
            className={`flex items-center justify-center gap-3 px-5 h-[56px] cursor-pointer rounded-[5px] border transition-all text-left
              ${selected === type.id
                ? 'border-brand-text bg-indigo-50'
                : 'border-[#C3C3C3] bg-white hover:border-indigo-300 hover:bg-gray-50'
              }`}
          >
            <img
              src="/assets/icons/movie-edit.svg"
              alt=""
              className={`w-6 h-6 shrink-0`}
            />
            <span className={`font-medium text-[15px] ${selected === type.id ? 'text-indigo-700' : 'text-text-h1 font-medium text-2xl leading-[32px]'}`}>
              {type.label}
            </span>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-[700px] flex justify-start">
        <button
          onClick={handleNext}
          disabled={!selected}
          className={`w-[137px] h-[38px] bg-button-color text-white text-[15px] leading-[18px] cursor-pointer font-medium rounded-[6px] transition flex items-center justify-center gap-2 hover:opacity-65 ${selected ? 'opacity-100 hover:opacity-100' : 'opacity-65'} disabled:cursor-not-allowed`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Step1;
