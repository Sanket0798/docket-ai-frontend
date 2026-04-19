import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import api from '../../services/api';
import loginIllustration from '../../assets/auth/login-illustration.svg';

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    company_name: '', password: '', confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateField = (name, value) => {
    switch (name) {
      case 'first_name':
        if (!value.trim()) return 'First name is required';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Only letters allowed';
        return '';
      case 'last_name':
        if (!value.trim()) return 'Last name is required';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Only letters allowed';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
        return '';
      case 'phone':
        if (value && !/^\+?[0-9\s\-]{7,15}$/.test(value)) return 'Enter a valid phone number';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Must contain at least one uppercase letter';
        if (!/[0-9]/.test(value)) return 'Must contain at least one number';
        return '';
      case 'confirm_password':
        if (!value) return 'Please confirm your password';
        if (value !== form.password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error as user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Re-validate confirm_password live when password changes
    if (name === 'password' && form.confirm_password) {
      setErrors(prev => ({
        ...prev,
        confirm_password: value !== form.confirm_password ? 'Passwords do not match' : '',
      }));
    }
    setServerError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate all fields
    const newErrors = {};
    ['first_name', 'last_name', 'email', 'phone', 'password', 'confirm_password'].forEach(f => {
      newErrors[f] = validateField(f, form[f]);
    });
    setErrors(newErrors);
    if (Object.values(newErrors).some(e => e)) return;
    if (!agreed) {
      setServerError('Please accept the Terms and Conditions');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        company_name: form.company_name,
        password: form.password,
      });
      navigate('/verify-email', { state: { userId: res.data.userId, email: form.email } });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed! Please try again later');
    } finally {
      setLoading(false);
    }
  };

  // Helper for input className
  const inputCls = (name) =>
    `w-full px-[14px] py-[7px] border rounded-[6px] text-sm placeholder-[#B4B3B9] focus:outline-none focus:ring-1 transition ${errors[name]
      ? 'border-[#FF291E] text-[#EA4335] focus:border-[#FF291E] focus:ring-[#FF291E]'
      : 'border-input-border text-gray-900 focus:border-indigo-500 focus:ring-indigo-500'
    }`;

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#F8F7FA] lg:w-[816px] rounded-[20px] m-8 relative overflow-hidden">
        <div>
          <img
            src={loginIllustration}
            alt="Register illustration"
            className="w-full h-auto"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-0 lg:py-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-[26px]">
            <h2 className="font-medium text-[26px] leading-9 text-text-h1">Adventure starts here</h2>
            <p className="font-normal leading-[22px] text-[15px] text-text-h2">Make your app management easy and fun!</p>
          </div>

          {serverError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* First Name */}
            <div>
              <label className="font-semibold text-sm text-input-label mb-1 block">First Name</label>
              <input type="text" name="first_name" value={form.first_name}
                onChange={handleChange} onBlur={handleBlur}
                placeholder="John" required
                className={inputCls('first_name')} />
              {errors.first_name && <p className="mt-1 text-xs text-[#EA4335]">{errors.first_name}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label className="font-semibold text-sm text-input-label mb-1 block">Last Name</label>
              <input type="text" name="last_name" value={form.last_name}
                onChange={handleChange} onBlur={handleBlur}
                placeholder="Doe" required
                className={inputCls('last_name')} />
              {errors.last_name && <p className="mt-1 text-xs text-[#EA4335]">{errors.last_name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="font-semibold text-sm text-input-label mb-1 block">Mobile Number</label>
              <input type="tel" name="phone" value={form.phone}
                onChange={handleChange} onBlur={handleBlur}
                placeholder="Mobile Number"
                className={inputCls('phone')} />
              {errors.phone && <p className="mt-1 text-xs text-[#EA4335]">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="font-semibold text-sm text-input-label mb-1 block">Email ID</label>
              <input type="email" name="email" value={form.email}
                onChange={handleChange} onBlur={handleBlur}
                placeholder="john@example.com" required
                className={inputCls('email')} />
              {errors.email && <p className="mt-1 text-xs text-[#EA4335]">{errors.email}</p>}
            </div>

            {/* Company Name */}
            <div>
              <label className="font-semibold text-sm text-input-label mb-1 block">Company Name</label>
              <input type="text" name="company_name" value={form.company_name}
                onChange={handleChange}
                placeholder="Company Name"
                className="w-full px-[14px] py-[7px] border border-input-border rounded-[6px] text-sm text-gray-900 placeholder-[#B4B3B9] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" />
            </div>

            {/* Password */}
            <div>
              <label className="font-semibold text-sm text-input-label mb-1 block">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="Min. 8 characters" required minLength={8}
                  className={inputCls('password')} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-[#EA4335]">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="font-semibold text-sm text-input-label mb-1 block">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} name="confirm_password" value={form.confirm_password}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="Repeat password" required
                  className={inputCls('confirm_password')} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showConfirm ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>
              {errors.confirm_password && <p className="mt-1 text-xs text-[#EA4335]">{errors.confirm_password}</p>}
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input type="checkbox" id="agree" checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="agree" className="text-sm text-gray-600 leading-snug">
                I agree to the{' '}
                <span className="text-indigo-600 cursor-pointer hover:underline">privacy policy & terms</span>
              </label>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className={`w-full h-[38px] bg-button-color text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer hover:opacity-100 ${agreed ? 'opacity-100' : 'opacity-65'}`}>
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Create Account'}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-4 font-normal text-[15px] leading-[22px] text-text-h2 text-center">
            Already a member?{' '}
            <Link to="/login" className="text-brand-color font-medium hover:underline">Sign in</Link>
          </p>

          {/* WhatsApp community */}
          <div className="mt-4 flex items-start gap-2">
            <input type="checkbox" id="whatsapp"
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="whatsapp" className="font-normal text-[15px] leading-[22px] text-text-h2">
              Join our Whatsapp community and get the latest updates.
            </label>
          </div>

          {/* Terms footer */}
          <div className="mt-[26px] text-center">
            <p className="font-normal text-xs leading-[22px] text-text-h2">
              By signing up, you accept our{' '}
              <span className="text-brand-color cursor-pointer hover:underline">Terms and Conditions</span>
            </p>
            <p className="font-normal text-xs leading-[22px] text-text-h2">
              See our <span className="text-brand-color cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
