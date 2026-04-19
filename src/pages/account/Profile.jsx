import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    billing_info: '',
    gstin: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/profile')
      .then(res => {
        setForm({
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          billing_info: res.data.billing_info || '',
          gstin: res.data.gstin || '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setShowSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) {
      setError('First name is required');
      return;
    }
    setSaving(true);
    try {
      await api.put('/profile', {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        billing_info: form.billing_info,
        gstin: form.gstin,
      });
      const res = await api.get('/auth/me');
      login(localStorage.getItem('token'), res.data);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full h-[38px] px-[14px] border border-input-border rounded-[6px] font-normal text-sm leading-[24px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition";
  const labelCls = "block font-semibold text-sm text-text-h2 mb-1";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] pt-7 pb-16 lg:pb-[138px]">
        <h1 className="font-medium text-heading-text text-[26px] leading-[36px] mb-[18px]">Profile setting</h1>

        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="lg:max-w-full">

            {/* Error */}
            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Row 1: First Name + Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className={labelCls}>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Diam"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Row 2: Email + Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className={labelCls}>Email ID</label>
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  placeholder="john@gmail.com"
                  className="w-full h-[38px] px-[14px] border border-input-border rounded-[6px] text-sm text-gray-500 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className={labelCls}>Contact</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9765456780"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Row 3: Billing Info */}
            <div className="mb-5">
              <label className={labelCls}>Billing Info</label>
              <input
                type="text"
                name="billing_info"
                value={form.billing_info}
                onChange={handleChange}
                placeholder="Cash"
                className={inputCls}
              />
            </div>

            {/* Row 4: GSTIN */}
            <div className="mb-7">
              <label className={labelCls}>GSTIN</label>
              <input
                type="text"
                name="gstin"
                value={form.gstin}
                onChange={handleChange}
                placeholder="XT-345-670-7890"
                className={inputCls}
              />
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              className="h-[38px] w-[192px] bg-brand-color disabled:opacity-60 text-white text-[15px] leading-[18px] font-medium rounded-[6px] transition flex items-center justify-center cursor-pointer"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Save'}
            </button>
          </form>
        )}
      </main>

      <Footer />

      {/* Success popup */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[18px] shadow-xl px-6 py-8 lg:px-10 flex flex-col items-center justify-center gap-6 w-full max-w-[560px] mx-4 lg:max-w-[1128px] lg:h-[340px]">
            <div className='rounded-full w-[75px] h-[75px]'>
              <img src="/assets/icons/check_circle.svg" alt="Success" />
            </div>
            <div className="text-center space-y-4">
              <p className="font-medium text-[22px] lg:text-[32px] leading-[24px] text-secondary-text">Changes saved successfully</p>
              <p className="font-light text-base lg:text-lg leading-[24px] px-2 lg:px-10 text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod <br /> tempor incididunt ut labore et dolore magna aliqua.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
