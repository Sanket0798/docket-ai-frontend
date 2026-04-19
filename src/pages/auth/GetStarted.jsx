import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const GetStarted = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [bio, setBio] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleContinue = () => {
    navigate('/onboarding/step1');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Logout top-right */}
      <div className="flex justify-end px-4 pt-4 lg:px-8 lg:pt-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 h-[38px] bg-button-color text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
        >
          Logout
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H7" />
          </svg>
        </button>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-0 lg:py-0">
        <div className="w-full max-w-[512px]">
          {/* Heading */}
          <h2 className="font-medium text-[26px] leading-9 text-text-h1 mb-1">
            You are all set to get started
          </h2>
          <p className="font-normal text-[15px] leading-[22px] text-text-h2 mb-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit,
          </p>

          {/* Textarea */}
          <div className="mb-4">
            <label className="font-semibold text-sm text-input-label mb-2 block">
              Tell me something about yourself...
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell me something about yourself..."
              rows={5}
              className="w-full px-[14px] py-[10px] border border-input-border rounded-[6px] text-sm text-gray-900 placeholder-[#B4B3B9] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            className="w-full h-[38px] bg-button-color text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
