import { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

/* ─── per-plan static config ─────────────────────────────────────────── */
const PLAN_CONFIG = {
  Starter: {
    label: 'BASIC PLAN',
    subtitle: 'For Beginners / Trying the platform',
    featured: false,
    features: [
      { text: 'Image generation (AI scenes)', included: true },
      { text: 'Basic AI suggestions', included: true },
      { text: 'Standard processing speed', included: true },
      { text: 'Access to core features', included: true },
      { text: 'Video generation', included: false },
      { text: 'Priority processing', included: false },
      { text: 'Advanced cinematic controls', included: false },
      { text: 'High-quality rendering', included: false },
    ],
  },
  Pro: {
    label: 'STANDARD PLAN',
    subtitle: 'For Regular creators / Filmmakers',
    featured: true,
    features: [
      { text: 'Image generation (AI scenes)', included: true },
      { text: 'Basic AI suggestions', included: true },
      { text: 'AI scene suggestions', included: true },
      { text: 'Better quality outputs', included: true },
      { text: 'Faster processing', included: true },
      { text: 'Priority queue', included: false },
      { text: 'Advanced director-level', included: false },
      { text: 'Ultra HD exports', included: false },
    ],
  },
  Business: {
    label: 'PREMIUM PLAN',
    subtitle: 'For Professionals / Heavy usage',
    featured: false,
    features: [
      { text: 'Image + Video generation', included: true },
      { text: 'High-quality cinematic outputs', included: true },
      { text: 'AI scene suggestions', included: true },
      { text: 'Better quality outputs', included: true },
      { text: 'Faster processing', included: true },
      { text: 'Unlimited credits', included: false },
      { text: 'Enterprise/team features', included: false },
    ],
  },
};

/* ─── Payment result screens ─────────────────────────────────────────── */
const PaymentSuccess = ({ referenceNo, onRedirect }) => {
  const [seconds, setSeconds] = useState(3);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(t); onRedirect(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onRedirect]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referenceNo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-24 px-4">
      {/* Blue check circle */}
      <div className="w-14 h-14 rounded-full bg-[#3B5BDB] flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 className="text-[22px] font-semibold text-gray-900 mb-2">Payment Successful</h2>
      <p className="text-sm text-gray-400 text-center max-w-[420px] mb-6">
        Your credits have been added to your account. You can now use them to generate images, videos, and AI-powered scenes.
      </p>

      {/* Reference number */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-700">Reference No : <span className="font-medium">#{referenceNo}</span></span>
        <button
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy reference'}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          {copied ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#3B5BDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
        </button>
      </div>

      {/* Countdown */}
      <p className="text-sm text-[#3B5BDB]">
        Redirecting to claims page in {seconds}...
      </p>
    </div>
  );
};

const PaymentFailed = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center flex-1 py-24 px-4">
    {/* Red X circle */}
    <div className="w-14 h-14 rounded-full bg-[#C0392B] flex items-center justify-center mb-6">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>

    <h2 className="text-[22px] font-semibold text-gray-900 mb-2">Payment unsuccessful</h2>
    <p className="text-sm text-gray-400 text-center max-w-[420px] mb-5">
      We were unable to process your payment. Please check your payment details and try again, or contact support if the issue persists.
    </p>

    <button
      onClick={onRetry}
      className="text-sm text-[#C0392B] hover:underline font-medium"
    >
      Some error occurred try again
    </button>
  </div>
);

/* ─── Main Credits page ───────────────────────────────────────────────── */
const Credits = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(null);
  const [paymentState, setPaymentState] = useState(null); // null | 'success' | 'failed'
  const [referenceNo, setReferenceNo] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    api.get('/credits/plans')
      .then(res => setPlans(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRedirect = () => {
    window.location.reload();
  };

  const handleBuy = async (plan) => {
    setOrdering(plan.id);
    try {
      const res = await api.post('/credits/order', { plan_id: plan.id });

      if (res.data.is_mock) {
        await api.post('/credits/verify', {
          order_id: res.data.order_id,
          payment_id: `pay_mock_${Date.now()}`,
          payment_method: 'Mock',
        });
        const mockRef = `IAR-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90000 + 10000)}`;
        setReferenceNo(mockRef);
        setPaymentState('success');
        toast(`${plan.credits} credits added to your account!`, 'success');
      } else {
        // Dynamically load Razorpay SDK if not already present
        if (!window.Razorpay) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
            document.body.appendChild(script);
          });
        }

        const options = {
          key: res.data.key_id,
          amount: res.data.amount,
          currency: res.data.currency,
          name: 'Docket Factory',
          description: `${plan.name} — ${plan.credits} Credits`,
          order_id: res.data.order_id,
          handler: async (response) => {
            try {
              await api.post('/credits/verify', {
                order_id: res.data.order_id,
                payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payment_method: 'Razorpay',
              });
              setReferenceNo(response.razorpay_payment_id);
              setPaymentState('success');
              toast(`${plan.credits} credits added to your account!`, 'success');
            } catch {
              setPaymentState('failed');
              toast('Payment verification failed. Contact support.', 'error');
            }
          },
          prefill: { name: '', email: '' },
          theme: { color: '#3B5BDB' },
          modal: {
            ondismiss: () => setOrdering(null),
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', () => {
          setPaymentState('failed');
          setOrdering(null);
        });
        rzp.open();
      }
    } catch (err) {
      console.error(err);
      setPaymentState('failed');
      toast('Could not initiate payment. Please try again.', 'error');
    } finally {
      setOrdering(null);
    }
  };

  /* ── Payment result screens ── */
  if (paymentState === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <PaymentSuccess referenceNo={referenceNo} onRedirect={handleRedirect} />
        <Footer />
      </div>
    );
  }

  if (paymentState === 'failed') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <PaymentFailed onRetry={() => setPaymentState(null)} />
        <Footer />
      </div>
    );
  }

  /* ── Plans page ── */
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-6 pt-14 pb-28">
        {/* Heading */}
        <div className="text-center mb-10 lg:mb-24">
          <h1 className="font-medium text-[26px] leading-9 text-text-h1 mb-[6px]">
            Power Your Creativity with Credits
          </h1>
          <p className="font-normal text-[15px] leading-[22px] text-text-h2">
            Use credits to generate images, videos, and AI-powered scenes
          </p>
        </div>

        {/* Plans grid */}
        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-4 border-[#3B5BDB] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            {plans.map((plan) => {
              const cfg = PLAN_CONFIG[plan.name] || PLAN_CONFIG.Starter;
              const isFeatured = cfg.featured;

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col items-center rounded-[5px] w-full md:w-[300px] transition-all
                    ${isFeatured
                      ? 'border border-[#3B5BDB] bg-[#F9F9F9] h-auto md:h-[630px] py-10 px-8 md:scale-110 z-10'
                      : 'border border-[#B0B0B0] p-7 h-auto md:h-[580px]'
                    }`}
                >
                  {/* Plan label */}
                  <h2 className="font-medium text-[26px] text-center leading-9 text-text-h1">
                    {cfg.label}
                  </h2>
                  <p className="font-normal text-[15px] text-center leading-[22px] text-text-h2 mb-6">{cfg.subtitle}</p>

                  {/* Price */}
                  <div className="text-center mb-1">
                    <span className={`text-[26px] font-bold leading-9 ${isFeatured ? 'text-text-h1' : 'text-text-h1'}`}>
                      ₹{plan.price}
                    </span>
                  </div>
                  <p className="font-light text-xl leading-9 text-text-h1 text-center mb-6">
                    ({plan.credits} Credits)
                  </p>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {cfg.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-[6px] text-[15px] font-normal leading-[22px]">
                        {f.included ? (
                          <>
                            <img src="/assets/icons/subscription-tick.svg" alt="" />
                            <span className="text-text-h2">{f.text}</span>
                          </>
                        ) : (
                          <>
                            <img src="/assets/icons/subscription-cross.svg" alt="" className='ml-1' />
                            <span className="text-[#9B9B9B] line-through ml-1">{f.text}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleBuy(plan)}
                    disabled={ordering === plan.id}
                    className="w-[74px] h-[30px] rounded text-[13px] font-medium bg-brand-color text-white hover:bg-[#2f4ec4] transition disabled:opacity-60 flex items-center justify-center cursor-pointer"
                  >
                    {ordering === plan.id ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : 'Buy Now'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        {/* <p className="text-center text-xs text-gray-400 mt-14">
          Payments are processed securely via Razorpay. Credits never expire.
        </p> */}
      </main>

      <Footer />
    </div>
  );
};

export default Credits;
