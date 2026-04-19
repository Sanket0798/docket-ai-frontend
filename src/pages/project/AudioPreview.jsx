import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MdPause, MdContentCopy, MdEdit, MdCheck, MdSaveAlt } from 'react-icons/md';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AudioPreview = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const initialAudioFiles = location.state?.audioFiles || [];   // passed from ScriptEditor
  const { toast } = useToast();

  // Local copy of audio files — seeded from navigation state,
  // then hydrated from the DB if the page is refreshed
  const [audioFiles, setAudioFiles] = useState(initialAudioFiles);
  const [audioFilesLoading, setAudioFilesLoading] = useState(initialAudioFiles.length === 0);
  const [projectName, setProjectName] = useState(location.state?.projectName || '');

  // If no state was passed (e.g. page refresh), load audio URL + project name from the project record
  useEffect(() => {
    if (initialAudioFiles.length > 0 && projectName) return;
    api.get(`/projects/${projectId}`)
      .then(res => {
        if (!projectName) setProjectName(res.data.name || '');
        if (initialAudioFiles.length === 0 && res.data.audio_url) {
          setAudioFiles([{ name: 'Audio 1', url: res.data.audio_url }]);
        }
      })
      .catch(console.error)
      .finally(() => setAudioFilesLoading(false));
  }, [projectId]);

  const [transcription, setTranscription] = useState('');
  const [status, setStatus] = useState('processing'); // 'processing' | 'completed' | 'error'
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState(0);

  const audioRefs = useRef([]);
  const pollRef = useRef(null);
  const [durations, setDurations] = useState({});

  // ── Start transcription & poll for result ─────────────────
  const startTranscription = useCallback(async () => {
    try {
      const res = await api.post(`/projects/${projectId}/transcribe`);
      if (res.data.status === 'completed') {
        clearInterval(pollRef.current);
        setTranscription(res.data.transcription);
        setEditedText(res.data.transcription);
        setStatus('completed');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      clearInterval(pollRef.current);
      setStatus('error');
    }
  }, [projectId]);

  const pollTranscription = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/transcription`);
      if (res.data.transcription) {
        clearInterval(pollRef.current);
        setTranscription(res.data.transcription);
        setEditedText(res.data.transcription);
        setStatus('completed');
      }
    } catch (err) {
      console.error('Poll error:', err);
      clearInterval(pollRef.current);
      setStatus('error');
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    api.get(`/projects/${projectId}/transcription`)
      .then(res => {
        if (cancelled) return;
        if (res.data.transcription) {
          setTranscription(res.data.transcription);
          setEditedText(res.data.transcription);
          setStatus('completed');
        } else {
          // Start transcription — it returns synchronously from Whisper
          startTranscription();
        }
      })
      .catch(() => {
        if (!cancelled) startTranscription();
      });

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [projectId, startTranscription]);

  const formatDuration = (s) => {
    if (!s || isNaN(s) || s === 0) return '--:--:--';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ── Audio playback ─────────────────────────────────────────
  const togglePlay = (index) => {
    const audio = audioRefs.current[index];
    if (!audio) return;
    if (playingIndex === index) {
      audio.pause();
      setPlayingIndex(null);
    } else {
      audioRefs.current.forEach((a, i) => { if (i !== index && a) a.pause(); });
      audio.play();
      setPlayingIndex(index);
      audio.onended = () => setPlayingIndex(null);
    }
  };

  // ── Delete audio clip from list ────────────────────────────
  const handleDeleteAudio = (index) => {
    // Pause the audio if it's currently playing
    const audio = audioRefs.current[index];
    if (audio) audio.pause();
    if (playingIndex === index) setPlayingIndex(null);

    setAudioFiles(prev => prev.filter((_, i) => i !== index));
    setDurations(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    // Adjust selectedAudio index if needed
    setSelectedAudio(prev => {
      if (index < prev) return prev - 1;
      if (index === prev) return 0;
      return prev;
    });

    // Remove the ref at this index
    audioRefs.current.splice(index, 1);
  };

  // ── Copy transcription ─────────────────────────────────────
  const handleCopy = () => {
    const text = isEditing ? editedText : transcription;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Save and submit ────────────────────────────────────────
  const handleSaveAndSubmit = async () => {
    setSubmitting(true);
    try {
      const finalText = isEditing ? editedText : transcription;
      await api.put(`/projects/${projectId}/script`, {
        script_text: finalText,
        additional_notes: '',
      });
      await api.put(`/projects/${projectId}/status`, { status: 'processing' });
      navigate(`/workspace/${workspaceId}/project/${projectId}/submitted`,
        { state: { workspaceName } });
    } catch (err) {
      console.error(err);
      toast('Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] py-[51px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-9">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/editor`,
              { state: { workspaceName, uploadType: 'audio' } })}
            className="cursor-pointer"
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <span className="text-text-h1 text-[22px] lg:text-[34px] leading-12 font-medium truncate">{workspaceName} /</span>
          <span className="font-light text-[18px] lg:text-[30px] leading-10 text-[#A7A7A7] truncate">
            {projectName || '...'}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── LEFT — Uploaded audio files list ── */}
          <div className="w-full lg:w-[393px] flex flex-col">
            <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-2">Uploaded audio files</p>

            {audioFilesLoading ? (
              /* Fallback — show placeholder clips while loading */
              Array.from({ length: 3 }).map((_, i) => (
                <AudioClipCard
                  key={i}
                  name={`Audio ${i + 1}`}
                  isPlaying={false}
                  isSelected={selectedAudio === i}
                  duration="--:--:--"
                  onPlay={() => setSelectedAudio(i)}
                  onDelete={() => { }}
                />
              ))
            ) : audioFiles.length === 0 ? (
              /* All audios deleted */
              <p className="text-sm text-gray-400 mt-4">No audio files. Go back to upload.</p>
            ) : (
              audioFiles.map((audio, i) => (
                <div key={i}>
                  <audio
                    ref={el => {
                      audioRefs.current[i] = el;
                      if (el && !durations[i]) {
                        el.onloadedmetadata = () => {
                          setDurations(prev => ({ ...prev, [i]: el.duration }));
                        };
                      }
                    }}
                    src={audio.url}
                    style={{ visibility: 'hidden', position: 'absolute', width: 0, height: 0 }}
                    preload="metadata"
                  />
                  <AudioClipCard
                    name={audio.name}
                    isPlaying={playingIndex === i}
                    isSelected={selectedAudio === i}
                    duration={formatDuration(durations[i])}
                    onPlay={() => { setSelectedAudio(i); togglePlay(i); }}
                    onDelete={() => handleDeleteAudio(i)}
                  />
                </div>
              ))
            )}
          </div>

          {/* ── RIGHT — Transcription preview ── */}
          <div className="flex-1 flex flex-col">
            <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-2">Preview text of audio Extract</p>

            <div className="flex-1 border border-input-border rounded-[6px] overflow-hidden flex flex-col" style={{ minHeight: '542px' }}>
              {/* Tab header */}
              <div className="flex items-center justify-between px-4 h-[87px] border-b border-[#C5C5C5]">
                <span className="text-sm font-medium text-brand-color">
                  {audioFiles[selectedAudio]?.name || 'Audio 1'}
                </span>
                <button className="text-gray-400 hover:text-gray-600 text-lg leading-none">···</button>
              </div>

              {/* Content area */}
              <div className="flex-1 py-5 px-[25px] bg-[#F2F2F2]">
                {status === 'processing' ? (
                  /* Loading state */
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="relative w-16 h-16">
                      {/* Spinner matching Figma design */}
                      <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-brand-color border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    </div>
                    <p className="font-normal text-base leading-6 text-[#1E1E1E]">Pls wait while we convert audio into text</p>
                  </div>
                ) : status === 'error' ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <p className="text-sm text-red-500">Transcription failed. Please try again.</p>
                    <button
                      onClick={startTranscription}
                      className="h-[34px] px-4 bg-brand-color text-white text-xs font-medium rounded-lg"
                    >
                      Retry
                    </button>
                  </div>
                ) : isEditing ? (
                  /* Edit mode */
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full h-full min-h-[400px] font-normal text-base leading-6 text-[#1E1E1E] resize-none focus:outline-none"
                    autoFocus
                  />
                ) : (
                  /* Read mode */
                  <p className="font-normal text-base leading-6 text-[#1E1E1E] whitespace-pre-wrap">
                    {transcription}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-[45px]">
              {/* Copy + Edit — only when completed */}
              {status === 'completed' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 w-[142px] h-[38px] px-5 bg-[#D9DDE9] text-[15px] leading-[18px] font-medium rounded-[6px] cursor-pointer transition"
                  >
                    {/* {copied ? <MdCheck size={15} className="text-green-500" /> : <MdContentCopy size={15} />} */}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setTranscription(editedText);
                        setIsEditing(false);
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 w-[142px] h-[38px] px-5 bg-[#D9DDE9] text-[15px] leading-[18px] font-medium rounded-[6px] cursor-pointer transition"
                  >
                    {/* <MdEdit size={15} /> */}
                    {isEditing ? 'Done' : 'Edit'}
                  </button>
                </div>
              ) : (
                <div />
              )}

              {/* Save and submit */}
              <button
                onClick={handleSaveAndSubmit}
                disabled={submitting || status !== 'completed'}
                className="flex items-center gap-2 h-[38px] px-6 bg-brand-color hover:bg-blue-700 disabled:opacity-40 text-white text-[15px] leading-[18px] font-medium cursor-pointer rounded-[6px] transition"
              >
                <img src="/assets/icons/pdf-submit.svg" alt="" />
                {submitting ? 'Submitting...' : 'Save and submit'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

// ── Waveform component (same as ScriptEditor) ─────────────
const CLUSTERS = 4;
const BARS_PER_CLUSTER = 18;

const clusterHeights = Array.from({ length: CLUSTERS }, (_, c) =>
  Array.from({ length: BARS_PER_CLUSTER }, (_, b) => {
    return Math.abs(Math.sin((c * 3.7 + b) * 0.55) * 18 + Math.sin((c * 2.1 + b) * 1.1) * 8) + 4;
  })
);

const WaveformDisplay = () => (
  <div className="relative flex items-center w-full h-full overflow-hidden">
    {/* Continuous dotted baseline */}
    <div className="absolute inset-x-0 flex items-center justify-between px-1" style={{ top: '50%', transform: 'translateY(-50%)' }}>
      {Array.from({ length: 120 }).map((_, i) => (
        <div key={i} className="w-px h-px rounded-full bg-brand-color opacity-50 shrink-0" />
      ))}
    </div>
    {/* Clusters + vertical markers */}
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

// ── Reusable audio clip card ───────────────────────────────
const AudioClipCard = ({ name, isPlaying, isSelected, duration = '00:00:00', onPlay, onDelete }) => (
  <div
    className={`border rounded-[6px] py-2 px-3.5 mb-[18px] cursor-pointer transition ${isSelected ? 'border-brand-color' : 'border-input-border hover:border-gray-300'
      }`}
    onClick={onPlay}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm leading-[150%] font-medium text-brand-color">{name}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="cursor-pointer"
      >
        <img src="/assets/icons/delete-audio-2.svg" alt="" />
      </button>
    </div>
    <div className="flex items-center bg-[#FAFBFF] rounded">
      <button
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-brand-color transition shrink-0"
      >
        {isPlaying
          ? <MdPause size={16} className="cursor-pointer" />
          : <img src="/assets/icons/audio-play.svg" alt="" className="cursor-pointer" />
        }
      </button>
      <div className="rounded-[6px] flex items-center gap-px flex-1 h-[52px] px-2 overflow-hidden">
        <WaveformDisplay />
      </div>
    </div>
    <div className="text-end">
      <span className="font-medium text-xs leading-[150%] text-[#4A4755]">{duration}</span>
    </div>
  </div>
);

export default AudioPreview;
