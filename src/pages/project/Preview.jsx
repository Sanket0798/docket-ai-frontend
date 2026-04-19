import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

// Same gradient used in AIQuestions for placeholder images
const CARD_GRADIENTS = [
  'from-yellow-200 via-orange-300 to-purple-400',
  'from-orange-200 via-yellow-300 to-green-300',
  'from-purple-200 via-blue-300 to-orange-300',
  'from-yellow-300 via-orange-200 to-teal-300',
];

const Preview = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const answersFromState = location.state?.answers || {};

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [projectName, setProjectName] = useState(location.state?.projectName || '');

  // Track wishlisted cards: { "sectionIndex-cardIndex": true }
  const [wishlisted, setWishlisted] = useState({});
  // Track deleted cards: { "sectionIndex-cardIndex": true }
  const [deleted, setDeleted] = useState({});
  // Wishlist toast
  const [wishlistMsg, setWishlistMsg] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${projectId}/questions`),
      projectName ? Promise.resolve(null) : api.get(`/projects/${projectId}`),
    ])
      .then(([questionsRes, projectRes]) => {
        setQuestions(questionsRes.data);
        if (projectRes) setProjectName(projectRes.data.name || '');
      })
      .catch(err => {
        console.error(err);
        toast('Failed to load preview data. Please go back and try again.', 'error');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.put(`/projects/${projectId}/status`, { status: 'completed' });
      navigate(`/workspace/${workspaceId}/project/${projectId}/success`,
        { state: { workspaceName } });
    } catch (err) {
      console.error(err);
      toast('Export failed. Please try again.', 'error');
    } finally {
      setExporting(false);
      setShowConfirm(false);
    }
  };

  const handleWishlist = async (sectionIndex, cardIndex, questionId) => {
    const key = `${sectionIndex}-${cardIndex}`;
    if (wishlisted[key]) return; // already wishlisted

    try {
      await api.post('/wishlist', {
        project_id: projectId,
        image_url: null, // placeholder — real URL when AI generates images
        image_index: cardIndex,
        question_id: questionId || `q_${sectionIndex}`,
        tags: sections[sectionIndex]?.question?.split(' ').slice(0, 2).join(',') || 'Lighting,Mood',
      });
      setWishlisted(prev => ({ ...prev, [key]: true }));
      setWishlistMsg('Added to wishlist!');
      setTimeout(() => setWishlistMsg(''), 2000);
    } catch (err) {
      console.error(err);
      toast('Failed to add to wishlist', 'error');
    }
  };

  const handleDeleteCard = (sectionIndex, cardIndex) => {
    const key = `${sectionIndex}-${cardIndex}`;
    setDeleted(prev => ({ ...prev, [key]: true }));
  };

  // Build preview sections — one per question
  // Each section shows the question + selected image cards
  const sections = questions.length > 0
    ? questions.map((q, i) => ({
      question: q.question,
      subtitle: 'Lighting influences the visual mood and depth of your scene',
      gradient: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
      // answer is comma-separated indices e.g. "0,2,4"
      selectedCount: q.answer ? q.answer.split(',').length : 4,
    }))
    : CARD_GRADIENTS.map((g, i) => ({
      question: 'What lighting tone fits this scene?',
      subtitle: 'Lighting influences the visual mood and depth of your scene',
      gradient: g,
      selectedCount: 4,
    }));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] py-[51px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-[58px]">
          <span className="text-text-h1 text-[22px] lg:text-[34px] leading-12 font-medium truncate">{workspaceName} /</span>
          <span className="font-light text-[18px] lg:text-[30px] leading-10 text-[#A7A7A7] truncate">
            {projectName || '...'}
          </span>
        </div>

        {/* Heading */}
        <div className="flex flex-row mb-2 gap-5">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/questions`,
              { state: { workspaceName, resumeStep: 3 } })}
            className=" cursor-pointer"
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <h1 className="font-medium text-[22px] lg:text-[34px] leading-[48px] text-text-h1">Preview</h1>
        </div>
        <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-9" style={{ fontFamily: 'Geist, sans-serif' }}>All selected generates in one place</p>

        {/* Preview container */}
        <div className="flex flex-col items-center justify-center border border-input-border rounded-[6px] bg-[#F9F9F9] py-9 mb-[73px]">

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-brand-color border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-[30px]">
              {sections.map((section, si) => (
                <div key={si}>
                  {/* Question title */}
                  <h2 className="font-medium text-[22px] leading-8 text-text-h1 mb-2">{section.question}</h2>
                  <p className="font-normal text-sm leading-[130%] text-[#5D586C] mb-5">{section.subtitle}</p>

                  {/* Selected image grid — 2 cols on mobile, 4 on desktop */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: section.selectedCount }).map((_, i) => {
                      const key = `${si}-${i}`;
                      if (deleted[key]) return null;
                      const isWishlisted = wishlisted[key];
                      return (
                        <div
                          key={i}
                          className="relative rounded-[4px] overflow-hidden border-[3px] border-brand-color"
                        >
                          {/* Placeholder image */}
                          <img
                            src="/assets/project/AI-Image.jpg"
                            alt=""
                            className="w-[205px] h-[137px] object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.classList.add(`bg-gradient-to-br`, section.gradient);
                            }}
                          />
                          {/* Icon badges top-right */}
                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                            {/* Delete card */}
                            <button
                              onClick={() => handleDeleteCard(si, i)}
                              className="w-6 h-5 bg-white rounded-[6px] flex items-center justify-center hover:bg-red-50 transition cursor-pointer"
                              title="Remove"
                            >
                              <img src="/assets/icons/delete-fill.svg" alt="" />
                            </button>
                            {/* Add to wishlist */}
                            <button
                              onClick={() => handleWishlist(si, i, questions[si]?.id)}
                              className={`w-6 h-5 rounded-[6px] flex items-center justify-center transition cursor-pointer
                                ${isWishlisted ? 'bg-red-100' : 'bg-white hover:bg-red-50'}`}
                              title={isWishlisted ? 'Wishlisted' : 'Add to wishlist'}
                            >
                              <img
                                src="/assets/icons/heart.svg"
                                alt=""
                                className={isWishlisted ? 'opacity-100' : 'opacity-70'}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save and export button — bottom left */}
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center justify-center w-[192px] h-[38px] px-6 bg-brand-color hover:bg-blue-700 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer"
        >
          Save and export
        </button>

        {/* Wishlist toast */}
        {wishlistMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-[6px] shadow-lg z-50 flex items-center gap-2">
            <img src="/assets/icons/wishlist-heart.svg" alt="" className="w-4 h-4" />
            {wishlistMsg}
          </div>
        )}
      </main>

      <Footer />

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white border border-[#CAC9CD] rounded-[6px] w-full max-w-[560px] lg:max-w-[1000px] lg:h-[488px] mx-4 px-6 py-10 flex flex-col items-center justify-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-[26px] lg:text-[34px] leading-[48px] text-text-h1 mb-1">Are you sure ?</h2>
            <p className="font-normal text-base lg:text-lg leading-[130%] text-[#5D586C] mb-5">
              Are you sure you want to save and export? No changes can be<br />done once file is exported
            </p>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="h-[38px] w-[192px] px-8 bg-[#E0E8FF] hover:bg-gray-200 text-black text-[15px] font-medium rounded-[6px] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="h-[38px] w-[192px] px-8 bg-brand-color text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer"
              >
                {exporting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Preview;
