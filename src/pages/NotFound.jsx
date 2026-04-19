import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[100px] font-bold text-indigo-100 leading-none select-none">404</p>
      <h1 className="text-[28px] font-bold text-gray-900 -mt-4 mb-3">Page not found</h1>
      <p className="text-gray-500 text-[15px] mb-8 max-w-[380px]">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="h-[42px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default NotFound;
