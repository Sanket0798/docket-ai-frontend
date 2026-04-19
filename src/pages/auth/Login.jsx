import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import loginIllustration from '../../assets/auth/login-illustration.svg';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    setError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      email: validateField('email', form.email),
      password: validateField('password', form.password),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(e => e)) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      navigate(res.data.onboardingDone ? '/dashboard' : '/onboarding/step1');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed !';
      if (err.response?.status === 403) {
        // Email not verified
        navigate('/verify-email', { state: { userId: err.response.data.userId, email: form.email } });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-between bg-white">
      {/* Left Panel - Illustration */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#F8F7FA] lg:w-[816px] rounded-[20px] m-8 relative overflow-hidden">
        <div className="">
          <img
            src={loginIllustration}
            alt="Login illustration"
            className="w-full h-auto"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-0 lg:py-0">
        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-[26px]">
            <h2 className="font-medium text-[26px] leading-9 text-text-h1">
              Welcome to Docket Factory!
            </h2>
            <p className="font-normal leading-[22px] text-[15px] text-text-h2">
              Please sign in to your account and start the adventure
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="font-semibold text-sm text-input-label mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="eg: user@gmail.com"
                required
                className={`w-full px-[14px] py-[7px] border rounded-[6px] text-sm placeholder-[#B4B3B9] focus:outline-none focus:ring-1 transition ${
                  errors.email
                    ? 'border-[#FF291E] text-[#EA4335] focus:border-[#FF291E] focus:ring-[#FF291E]'
                    : 'border-input-border text-gray-900 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-[#EA4335]">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-sm text-input-label">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your password"
                  required
                  className={`w-full px-[14px] py-[7px] border rounded-[6px] text-sm placeholder-[#B4B3B9] focus:outline-none focus:ring-1 transition pr-10 ${
                    errors.password
                      ? 'border-[#FF291E] text-[#EA4335] focus:border-[#FF291E] focus:ring-[#FF291E]'
                      : 'border-input-border text-gray-900 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-[#EA4335]">{errors.password}</p>}
            </div>

            {/* Remember me checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="remember" className="text-sm text-gray-600">
                Remember me
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[38px] bg-button-color opacity-65 hover:bg-button-color hover:opacity-100 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Sign in'}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-4 font-normal text-[15px] leading-[22px] text-text-h2 text-center">
            New on our platform?{' '}
            <Link to="/register" className="text-brand-color font-medium hover:underline">
              Create an account
            </Link>
          </p>

          {/* Terms */}
          <div className="mt-[26px] text-center">
            <p className="font-normal text-xs leading-[22px] text-text-h2">
              By signing in, you accept our{' '}
              <span className="text-brand-color cursor-pointer hover:underline">Terms and Conditions</span>
            </p>
            <p className="font-normal text-xs leading-[22px] text-text-h2">
              See our
              <span className="text-brand-color cursor-pointer hover:underline"> Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
