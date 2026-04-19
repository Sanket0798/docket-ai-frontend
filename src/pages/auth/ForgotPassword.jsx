import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import loginIllustration from '../../assets/auth/login-illustration.svg';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      navigate('/reset-password', {
        state: { userId: res.data.userId, email },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-surface-subtle w-[57%] px-16">
        <img src={loginIllustration} alt="" className="w-full max-w-[500px] h-auto"
          onError={(e) => { e.target.style.display = 'none'; }} />
      </div>

      {/* Right Panel */}
      <div className="flex flex-col justify-center w-full lg:w-[43%] px-8 py-10 lg:px-[94px] lg:py-0">
        <div className="mb-10">
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Docket Factory</h1>
        </div>

        <div className="mb-8">
          <h2 className="text-[26px] font-semibold text-gray-900 mb-2">Forgot Password?</h2>
          <p className="text-[15px] text-gray-500">
            Enter your email and we'll send you an OTP to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
              className="w-full h-[42px] px-4 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[42px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Send OTP'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500 text-center">
          Remember your password?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
