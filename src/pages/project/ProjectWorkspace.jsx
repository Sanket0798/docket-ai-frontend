import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';

// ─── Static waveform (reused from existing pages) ────────────────────────────
const CLUSTERS = 4;
const BARS_PER_CLUSTER = 18;
const clusterHeights = Array.from({ length: CLUSTERS }, (_, c) =>
  Array.from({ length: BARS_PER_CLUSTER }, (_, b) =>
    Math.abs(Math.sin((c * 3.7 + b) * 0.55) * 18 + Math.sin((c * 2.1 + b) * 1.1) * 8) + 4
  )
);

const WaveformDisplay = () => (
  <div className="relative flex items-center w-full h-full overflow-hidden">
    <div
      className="absolute inset-x-0 flex items-center justify-between px-1"
      style={{ top: '50%', transform: 'translateY(-50%)' }}
    >
      {Array.from({ length: 120 }).map((_, i) => (
        <div key={i} className="w-px h-px rounded-full bg-brand-color opacity-50 shrink-0" />
      ))}
    </div>
    <div className="relative flex items-center justify-between w-full h-full z-10">
      {Array.from({ length: CLUSTERS }).map((_, c) => (
        <div key={c} className="flex items-center gap-px">
          {clusterHeights[c].map((h, b) => (
            <div
              key={b}
              className="w-px rounded-full bg-brand-color"
              style={{ height: `${h}px` }}
            />
          ))}
          <div className="relative mx-0.5 shrink-0" style={{ width: '0.5px', height: '40px' }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-brand-color" />
            <div className="w-full h-full bg-brand-color" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Static audio clip card ───────────────────────────────────────────────────
const AudioClipCard = ({ name, duration = '00:10:04', isPlaying, onPlay }) => (
  <div className="border border-input-border rounded-[6px] py-2 px-3.5 mb-[14px]">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-brand-color">{name}</span>
      <div className="flex items-center gap-1">
        <button className="cursor-pointer">
          <img src="/assets/icons/delete-audio-2.svg" alt="delete" />
        </button>
        <button className="cursor-pointer">
          <img src="/assets/icons/find-replace.svg" alt="re-upload" />
        </button>
      </div>
    </div>
    <div className="flex items-center bg-[#FAFBFF] rounded">
      <button
        onClick={onPlay}
        className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
      >
        <img src="/assets/icons/audio-play.svg" alt="play" />
      </button>
      <div className="flex items-center gap-px flex-1 h-[52px] px-2 overflow-hidden">
        <WaveformDisplay />
      </div>
    </div>
    <div className="text-end mt-1">
      <span className="font-medium text-xs text-[#4A4755]">{duration}</span>
    </div>
  </div>
);

// ─── Static script file card ──────────────────────────────────────────────────
const ScriptFileCard = ({ name, size }) => (
  <div className="flex items-center justify-between py-2.5 px-3 border border-input-border rounded-[6px] mb-[10px]">
    <div className="flex items-center gap-2">
      <img src="/assets/icons/pdf.svg" alt="pdf" className="w-8 h-8" />
      <div>
        <p className="font-medium text-xs leading-[150%] text-black">{name}</p>
        <p className="font-medium leading-[150%] text-[8px] text-[#4A4755]">{size}</p>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <button className="cursor-pointer">
        <img src="/assets/icons/delete-audio-2.svg" alt="delete" />
      </button>
      <button className="cursor-pointer">
        <img src="/assets/icons/find-replace.svg" alt="re-upload" />
      </button>
    </div>
  </div>
);

// ─── AI Question image grid card ──────────────────────────────────────────────
const CARD_GRADIENTS = [
  'from-yellow-200 via-orange-300 to-purple-400',
  'from-orange-200 via-yellow-300 to-green-300',
  'from-purple-200 via-blue-300 to-orange-300',
  'from-yellow-300 via-orange-200 to-teal-300',
];

const AI_QUESTIONS = [
  {
    id: 'lighting',
    question: 'What lighting tone fits this scene?',
    subtitle: 'Lighting influences the visual mood and depth of your scene',
  },
  {
    id: 'mood',
    question: 'What mood should the video convey?',
    subtitle: 'The emotional tone shapes how your audience connects with the content',
  },
];

// ─── Content metadata (right panel) ──────────────────────────────────────────
const CONTENT_TAGS = [
  { label: 'Lighting', value: 'Warm' },
  { label: 'Mood', value: 'Romantic' },
  { label: 'Camera', value: 'Closeup' },
  { label: 'Mood', value: 'Romantic' },
  { label: 'Camera', value: 'Closeup' },
  { label: 'Mood', value: 'Romantic' },
  { label: 'Camera', value: 'Closeup' },
  { label: 'Mood', value: 'Romantic' },
  { label: 'Camera', value: 'Closeup' },
];

// ─── Main component ───────────────────────────────────────────────────────────
const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState('script');
  const [selectedCards, setSelectedCards] = useState({});
  const [wishlistAdded, setWishlistAdded] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (!projectId) return;
    api.get(`/projects/${projectId}`)
      .then(res => setProjectName(res.data.name || ''))
      .catch(console.error);
  }, [projectId]);

  const toggleCard = (qIdx, cardIdx) => {
    const key = `${qIdx}-${cardIdx}`;
    setSelectedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const tabs = [
    { id: 'script', label: 'Script view', icon: '/assets/icons/script.svg' },
    { id: 'questions', label: 'AI Questions', icon: '/assets/icons/star.svg' },
    { id: 'scene', label: 'Scene Generation', icon: '/assets/icons/scene-generation.svg' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* ── Page header ── */}
      <div className="px-4 lg:px-[60px] pt-8 pb-6 lg:pb-[74px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button className="cursor-pointer">
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <span className="text-text-h1 text-[22px] lg:text-[34px] leading-[48px] font-medium">
            {projectName || '...'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center justify-center gap-2 w-[140px] h-[38px] px-5 bg-[#D9DDE9] rounded-[6px] text-[15px] font-medium text-[#4A4755] transition cursor-pointer">
            Export
            <img src="/assets/icons/project-export.svg" alt="" />
          </button>
          <button className="flex items-center justify-center gap-2 w-[140px] h-[38px] px-5 bg-brand-color hover:bg-blue-700 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer">
            Save
            <img src="/assets/icons/project-save.svg" alt="" />
          </button>
        </div>
      </div>

      {/* ── Three-column layout ── */}
      <main className="flex-1 px-4 lg:px-[60px] pb-10 lg:pb-[74px]">
        <div className="flex flex-col lg:flex-row gap-5 h-full">

          {/* ══ LEFT PANEL — File manager ══ */}
          <div className="w-full lg:w-[316px] lg:shrink-0 flex flex-col gap-5">

            {/* Audio files */}
            <div className="border border-input-border rounded-[6px] p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-2xl leading-[48px] text-text-h1">Audio files</span>
                <div className="flex items-center gap-2">
                  <button className="w-9 h-6 bg-brand-color rounded-[4px] flex items-center justify-center cursor-pointer">
                    <img src="/assets/icons/project-audio-plus.svg" alt="add" />
                  </button>
                  <button className="w-9 h-6 flex items-center justify-center cursor-pointer bg-[#D9DDE9] rounded-[4px]">
                    <img src="/assets/icons/project-audio-wishlist.svg" alt="wishlist" />
                  </button>
                </div>
              </div>
              <AudioClipCard name="Audio 1" duration="00:10:04" />
              <AudioClipCard name="Audio 1" duration="00:02:04" />
              <AudioClipCard name="Audio 1" duration="00:10:04" />
              <AudioClipCard name="Audio 1" duration="00:10:04" />
            </div>

            {/* Script files */}
            <div className="border border-input-border rounded-[6px] p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-2xl leading-[48px] text-text-h1">Script files</span>
                <div className="flex items-center gap-2">
                  <button className="w-9 h-6 bg-brand-color rounded-[4px] flex items-center justify-center cursor-pointer">
                    <img src="/assets/icons/project-audio-plus.svg" alt="add" />
                  </button>
                  <button className="w-9 h-6 flex items-center justify-center cursor-pointer bg-[#D9DDE9] rounded-[4px]">
                    <img src="/assets/icons/project-audio-wishlist.svg" alt="wishlist" />
                  </button>
                </div>
              </div>
              <ScriptFileCard name="Script.pdf" size="14 Mb" />
              <ScriptFileCard name="Script.pdf" size="14 Mb" />
              <ScriptFileCard name="Script.pdf" size="14 Mb" />
            </div>
          </div>

          {/* ══ CENTER PANEL — Tabbed work area ══ */}
          <div className="border border-input-border rounded-[6px] flex flex-col min-h-[700px]">

            {/* Tab bar */}
            <div className="flex items-center border-b border-input-border px-5 pt-1 gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium border-b-2 transition cursor-pointer
                    ${activeTab === tab.id
                      ? 'border-brand-color text-brand-color'
                      : 'border-transparent text-text-h2 hover:text-[#4A4755]'
                    }`}
                >
                  <img
                    src={tab.icon}
                    alt=""
                    className={`w-4 h-4 ${activeTab === tab.id ? '' : 'opacity-100'}`}
                  />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">

              {/* ── Script view tab ── */}
              {activeTab === 'script' && (
                <div className="flex flex-col flex-1">
                  {/* Script text */}
                  <p className="font-normal text-[15px] leading-[1.7] text-[#4A4755] mb-6">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque sit amet pretium
                    augue. Curabitur non leo urna. In lobortis iaculis porttitor. Sed blandit viverra
                    metus, vitae suscipit dolor bibendum a. Ut ac risus sed magna semper molestie.
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque sit amet pretium
                    augue. Curabitur non leo urna. In lobortis iaculis porttitor. Sed blandit viverra
                    metus, vitae suscipit dolor bibendum a. Ut ac risus sed magna semper molestie.
                  </p>

                  {/* Audio drop zone */}
                  <div className="border-2 border-dashed border-input-border rounded-[6px] flex flex-col items-center justify-center py-10 bg-[#FAFBFF] cursor-pointer hover:bg-blue-50 transition">
                    <img src="/assets/icons/audio-file-upload.svg" alt="" className="mb-2" />
                    <p className="text-sm font-normal text-[#4A4755] mb-1">Drop your audio file here</p>
                    <p className="text-sm font-normal text-brand-color mb-1">Browse File</p>
                    <p className="text-xs text-[#B4B3B9]">(supports MP3, WAV, FLAC and more)</p>
                  </div>

                  {/* Next button — pinned to bottom */}
                  <div className="mt-auto pt-6">
                    <button className="flex items-center gap-2 h-[38px] px-6 bg-brand-color hover:bg-blue-700 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer">
                      Next
                      <img src="/assets/icons/arrow-right.svg" alt="" className="brightness-0 invert" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── AI Questions tab ── */}
              {activeTab === 'questions' && (
                <div className="flex flex-col flex-1">
                  {AI_QUESTIONS.map((q, qIdx) => (
                    <div key={q.id} className="mb-10">
                      <h3 className="font-medium text-[18px] text-[#4A4755] mb-1">{q.question}</h3>
                      <p className="text-sm text-[#5D586C] mb-4">{q.subtitle}</p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, cardIdx) => {
                          const key = `${qIdx}-${cardIdx}`;
                          const isSelected = !!selectedCards[key];
                          return (
                            <button
                              key={cardIdx}
                              onClick={() => toggleCard(qIdx, cardIdx)}
                              className={`relative rounded-[6px] overflow-hidden border-2 transition-all cursor-pointer
                                ${isSelected
                                  ? 'border-brand-color border-[3px]'
                                  : 'border-transparent hover:border-gray-200'
                                }`}
                            >
                              <img
                                src="/assets/project/AI-Image.jpg"
                                alt=""
                                className="w-full h-[100px] object-cover"
                              />
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 w-8 h-6 rounded-[6px] bg-white flex items-center justify-center shadow">
                                  <img src="/assets/icons/seleted-tick.svg" alt="" className="w-3 h-3" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Next button — pinned to bottom */}
                  <div className="mt-auto pt-2">
                    <button className="flex items-center gap-2 h-[38px] px-6 bg-brand-color hover:bg-blue-700 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer">
                      Next
                      <img src="/assets/icons/arrow-right.svg" alt="" className="brightness-0 invert" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Scene Generation tab ── */}
              {activeTab === 'scene' && (
                <div className="flex flex-col h-full">
                  {/* Video player — full width, same as other tabs */}
                  <div className="w-[668px] h-full aspect-video flex items-center justify-center">
                    <img src="/assets/icons/video.svg" alt="" />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ══ RIGHT PANEL — Preview & Content ══ */}
          <div className="w-full lg:w-[327px] lg:shrink-0 flex flex-col">

            {/* Preview section */}
            <div className="border border-input-border flex flex-col items-center justify-center py-10 px-4 min-h-[351px] rounded-t-[5px]">
              <img src="/assets/icons/select-image.svg" alt="" />
              <p className="font-normal text-base leading-6 text-[#4F4F4F] mt-4 text-center">
                Select a image or video from workarea<br />preview will display here
              </p>
            </div>

            {/* Content metadata */}
            <div className="border border-input-border p-4 flex flex-col flex-1 rounded-b-[5px]">
              <p className="font-normal text-base leading-6 text-[#252525] mb-2">Content</p>
              <div className="flex flex-col gap-1 flex-1">
                {CONTENT_TAGS.map((tag, i) => (
                  <p key={i} className="font-normal text-sm leading-6 text-text-h2">
                    <span className="font-normal text-sm leading-6 text-text-h2">{tag.label}</span> : {tag.value}
                  </p>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWishlistAdded(prev => !prev)}
                  className={`flex items-center gap-1.5 w-[173px] h-[38px] px-3 rounded-[6px] text-[15px] font-medium transition cursor-pointer
                    ${wishlistAdded
                      ? 'bg-[#FFE8EE] text-[#F2245B]'
                      : 'bg-brand-color hover:bg-blue-700 text-white'
                    }`}
                >
                  <img
                    src="/assets/icons/move-to-wishlist.svg"
                    alt=""
                    className={`${wishlistAdded ? '' : 'brightness-0 invert'}`}
                  />
                  {wishlistAdded ? 'Wishlisted' : 'Move to wishlist'}
                </button>
                <button className="w-[54px] h-[38px] bg-[#D9DDE9] rounded-[6px] flex items-center justify-center transition cursor-pointer">
                  <img src="/assets/icons/delete-black.svg" alt="delete" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
};

export default ProjectWorkspace;
