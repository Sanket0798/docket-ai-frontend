import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import Pagination from '../../components/Pagination';

const statusConfig = {
  completed: {
    icon: <img src='assets/icons/tick-outline.svg' alt='tick' />,
    label: 'Completed',
    cls: 'text-[#00A613]',
  },
  pending: {
    icon: <img src='assets/icons/warning.svg' alt='warning' />,
    label: 'Pending',
    cls: 'text-[#FF8D28]',
  },
  failed: {
    icon: <img src='assets/icons/cross-outline.svg' alt='cross' />,
    label: 'Error',
    cls: 'text-[#FF383C]',
  },
};

// Converts any raw order ID into a stable "TXN-XXXXN" display format
const formatTxnId = (rawId = '') => {
  // Extract digits and letters from the raw ID for a deterministic short code
  const digits = rawId.replace(/\D/g, '').slice(-4).padStart(4, '0');
  const letters = rawId.replace(/[^A-Za-z]/g, '').toUpperCase();
  const letter = letters.slice(-1) || 'A';
  return `TXN-${digits}${letter}`;
};

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    api.get('/credits/payments', { params: { page, limit: LIMIT } })
      .then(res => {
        setPayments(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = payments.filter(p =>
    p.plan_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.razorpay_order_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.payment_method?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] py-[50px]">
        {/* Header */}
        <h1 className="text-2xl font-medium leading-[22px] text-heading-text mb-4">Payment history</h1>
        <p className="font-light text-lg leading-6 text-secondary-text mb-7">
          Track your billing activity, invoices, and subscription payments
        </p>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <img src="/assets/icons/Credit-card.svg" alt="No transactions" className="mb-2" />
            <p className="text-[#1B1B1D] text-[31px] font-normal" style={{ fontFamily: 'Urbanist, sans-serif' }}>No Transactions yet</p>
          </div>
        ) : (
          <div>
            {/* Search — only shown when there are transactions */}
            <div className="relative mb-[26px]">
              <img src="assets/icons/search.svg" alt="" className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search payments...."
                className="w-full h-[53px] pl-9 pr-4 border border-input-border rounded-[6px] font-normal text-[15px] leading-6 text-gray-900 placeholder-[#B4B3B9] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
              />
            </div>

            {/* Table header — hidden on mobile */}
            <div className="hidden lg:grid grid-cols-7 gap-4 pb-3 border-b border-[#DCDCDC]">
              {['Transaction ID', 'Plan / Product', 'Transaction ID', 'Payment Method', 'Date', 'Status', 'Invoice'].map((h, i) => (
                <p key={i} className="font-medium text-base leading-[22px] text-text-h2 text-center">{h}</p>
              ))}
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-gray-400 text-sm">No transactions match your search</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-[19px]">
                {filtered.map((p) => {
                  const status = statusConfig[p.status] || statusConfig.pending;
                  return (
                    <div key={p.id}>
                      {/* Desktop row */}
                      <div className="hidden lg:grid grid-cols-7 gap-4 px-4 py-4 items-center border border-gray-200 rounded-[10px] bg-white hover:bg-gray-50 transition text-center text-text-h2 shadow-[0_3px_12px_0_rgba(0,0,0,0.07)]">
                        <p className="font-medium text-base pr-7 leading-[22px] truncate">
                          {p.razorpay_order_id ? formatTxnId(p.razorpay_order_id) : '—'}
                        </p>
                        <p className="">{p.plan_name || '—'}</p>
                        <p className="">₹{p.amount}</p>
                        <p className="">{p.payment_method || '—'}</p>
                        <p className="">{formatDate(p.created_at)}</p>
                        <div className="flex items-center justify-center gap-1.5 pl-3">
                          {status.icon}
                          <span className={`font-medium text-base leading-[22px] ${status.cls}`}>{status.label}</span>
                        </div>
                        <div className='pl-8'>
                          {p.status === 'completed' ? (
                            <button className="h-[30px] px-4 bg-brand-color hover:bg-indigo-700 font-medium text-[13px] leading-[14px] text-white rounded transition">
                              Download
                            </button>
                          ) : p.status === 'pending' ? (
                            <span className="font-normal text-[10px] leading-[15px] text-brand-color underline cursor-pointer">No invoice</span>
                          ) : null}
                        </div>
                      </div>
                      {/* Mobile card */}
                      <div className="lg:hidden border border-gray-200 rounded-[10px] bg-white p-4 shadow-[0_3px_12px_0_rgba(0,0,0,0.07)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-text-h2 truncate">
                            {p.razorpay_order_id ? formatTxnId(p.razorpay_order_id) : '—'}
                          </span>
                          <div className="flex items-center gap-1">
                            {status.icon}
                            <span className={`font-medium text-xs ${status.cls}`}>{status.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-h2">
                          <span>{p.plan_name || '—'}</span>
                          <span>₹{p.amount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-h2">
                          <span>{p.payment_method || '—'}</span>
                          <span>{formatDate(p.created_at)}</span>
                        </div>
                        {p.status === 'completed' && (
                          <button className="h-[28px] px-4 bg-brand-color hover:bg-indigo-700 font-medium text-[12px] text-white rounded transition">
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentHistory;
