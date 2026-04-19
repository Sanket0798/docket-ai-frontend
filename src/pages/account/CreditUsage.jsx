import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';

const CreditUsage = () => {
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usageRes, histRes] = await Promise.all([
          api.get('/credits/usage'),
          api.get('/credits/history', { params: { page, limit: LIMIT } }),
        ]);
        setUsage(usageRes.data);
        setHistory(histRes.data.data);
        setTotalPages(histRes.data.pagination.totalPages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short',
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* Warning banners */}
      {showBanner && usage && parseFloat(usage.credits_left) === 0 && (
        <div className="w-full bg-[#FDE7EA] border-b border-[#979797] px-4 lg:px-[60px] py-[10px] flex items-center gap-3">
          <img src="assets/icons/no-credit.svg" alt="" />
          <p className="font-normal text-base leading-6 text-[#F0142F] flex-1">
            No credits left! Recharge Now
          </p>
          <button onClick={() => setShowBanner(false)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
        </div>
      )}
      {showBanner && usage && parseFloat(usage.credits_left) > 0 && parseFloat(usage.credits_left) <= 50 && (
        <div className="w-full bg-[#FFF4C9] border-b border-[#FFE082] px-4 lg:px-[60px] py-[10px] flex items-center gap-3">
          <img src="assets/icons/low-credit.svg" alt="" />
          <p className="font-normal text-base leading-6 text-[#F99600] flex-1">
            Low on credits ! Recharge now
          </p>
          <button onClick={() => setShowBanner(false)} className="text-yellow-500 hover:text-yellow-700 text-lg leading-none">✕</button>
        </div>
      )}

      <main className="flex-1 px-4 lg:px-[60px] pt-[53px] pb-[94px]">
        {/* Header */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className="flex flex-col items-start gap-y-4">
            <h1 className="font-medium text-2xl text-heading-text leading-[22px]">Credit Usage</h1>
            <p className="font-light text-lg leading-6 text-secondary-text">
              Track your credit usage and manage your activity
            </p>
          </div>

          <button
            onClick={() => navigate('/credits')}
            className="h-[38px] w-[192px] bg-brand-color hover:bg-indigo-700 font-medium text-[15px] leading-[18px] text-white rounded-[6px] transition"
          >
            Purchase Credits
          </button>
        </div>



        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="flex flex-col lg:flex-row gap-4 mt-[35px] mb-[62px]">
              {[
                { label: 'Total credits purchased', value: usage?.total_purchased || 0 },
                { label: 'Credits already spent', value: usage?.total_spent || 0 },
                { label: 'Credits left to use', value: usage?.credits_left || 0 },
              ].map((stat, i) => (
                <div key={i} className="border border-[#BABABA] rounded-[10px] w-full lg:w-[455px] h-[114px] flex flex-col items-center justify-center text-center bg-white">
                  <p className="font-semibold text-[32px] mb-2" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                    {parseFloat(stat.value).toFixed(0)}
                  </p>
                  <p className="font-light text-lg leading-6 text-secondary-text" style={{ fontFamily: 'Urbanist, sans-serif' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Detailed Usage History */}
            <h2 className="font-medium text-2xl leading-[22px] text-heading-text mb-4">Detailed Usage History</h2>
            <p className="font-light text-lg leading-6 text-secondary-text mb-11">Track your credit usage and manage your activity</p>

            {/* Table header + Rows */}
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <img src="/assets/icons/files-off.svg" alt="No history" className='mb-6' />
                <p className="font-medium text-[32px] leading-6 text-secondary-text" style={{ fontFamily: 'Geist, sans-serif' }}>No History found</p>
              </div>
            ) : (
              <>
                {/* Desktop table header — hidden on mobile */}
                <div className="hidden lg:grid grid-cols-6 gap-4 pb-[14px] border-b border-[#DCDCDC] mb-4">
                  {['Action', 'Assets', 'Project', 'Credits Used', 'Date', 'Status'].map((h, i) => (
                    <p key={i} className="font-medium text-base leading-[22px] text-text-h2 text-center">{h}</p>
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  {history.map((item) => (
                    <div key={item.id}>
                      {/* Desktop row */}
                      <div className="hidden lg:grid grid-cols-6 gap-4 px-4 py-4 items-center border border-gray-200 rounded-[10px] bg-white hover:bg-gray-50 transition shadow-[0_3px_12px_0_rgba(0,0,0,0.07)] font-medium text-base leading-[22px] text-text-h2 text-center">
                        <p className="truncate">{item.action}</p>
                        <p className="truncate">{item.action_type || 'Image Generated'}</p>
                        <p className="truncate">{item.project_name || '—'}</p>
                        <p className="">{parseFloat(item.credits_used).toFixed(0)}</p>
                        <p className="pl-5">{formatDate(item.created_at)}</p>
                        <p className="pl-7 text-[#028900]">
                          {item.status === 'completed' ? 'Done' : item.status === 'failed' ? 'Failed' : item.status}
                        </p>
                      </div>
                      {/* Mobile card */}
                      <div className="lg:hidden border border-gray-200 rounded-[10px] bg-white p-4 shadow-[0_3px_12px_0_rgba(0,0,0,0.07)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-text-h2">{item.action}</span>
                          <span className="text-xs font-medium text-[#028900]">
                            {item.status === 'completed' ? 'Done' : item.status === 'failed' ? 'Failed' : item.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-h2">{item.action_type || 'Image Generated'}</p>
                        <div className="flex items-center justify-between text-xs text-text-h2">
                          <span>{item.project_name || '—'}</span>
                          <span>{parseFloat(item.credits_used).toFixed(0)} credits</span>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CreditUsage;
