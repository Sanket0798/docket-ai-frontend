import { useNavigate } from 'react-router-dom';

const ExportSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-[600px]">

        {/* Flying clock illustration */}
        <img
          src="/assets/icons/clock-flying.svg"
          alt="Video exported"
          className="mb-8"
        />

        {/* Heading */}
        <h1 className="font-bold text-[28px] lg:text-[40px] leading-7 text-[#3362CC] mb-8">
          Video Exported Successfully!
        </h1>

        {/* Back to dashboard link */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 font-medium text-xl leading-7 text-text-h1 transition cursor-pointer"
        >
          Back to dashboard
          <img src="/assets/icons/black-right-arrow.svg" alt="" />
        </button>
      </div>
    </div>
  );
};

export default ExportSuccess;
