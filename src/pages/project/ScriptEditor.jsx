import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MdAdd, MdDelete, MdPlayArrow, MdPause, MdStop, MdSave } from 'react-icons/md';
import { BsFilePdf, BsMicFill } from 'react-icons/bs';
import { LuSend } from 'react-icons/lu';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ScriptEditor = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const uploadType = location.state?.uploadType || 'pdf';
  const { toast } = useToast();

  // Script text & notes
  const [scriptText, setScriptText] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // PDF state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const pdfInputRef = useRef();

  // Audio state
  const [audioFile, setAudioFile] = useState(null);       // uploaded file (single)
  const [audioUploading, setAudioUploading] = useState(false);
  const [recordings, setRecordings] = useState([]);        // recorded clips list
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [playingIndex, setPlayingIndex] = useState(null);
  const audioInputRef = useRef();
  const timerRef = useRef();
  const audioRefs = useRef([]);

  // Load existing project data
  useEffect(() => {
    api.get(`/projects/${projectId}`)
      .then(res => {
        if (res.data.script_text) setScriptText(res.data.script_text);
        if (res.data.additional_notes) setAdditionalNotes(res.data.additional_notes);
        if (res.data.script_pdf_url) setPdfUrl(res.data.script_pdf_url);
      })
      .catch(console.error);
  }, [projectId]);

  // ── PDF handlers ──────────────────────────────────────────
  const handlePdfSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
    handlePdfUpload(file);
  };

  const handlePdfUpload = async (file) => {
    setPdfUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/projects/${projectId}/upload-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPdfUrl(res.data.url);
    } catch (err) {
      console.error('PDF upload failed:', err);
      toast('PDF upload failed. Only PDF files are allowed', 'error');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleRemovePdf = () => {
    setPdfFile(null);
    setPdfUrl('');
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  // ── Audio handlers ─────────────────────────────────────────
  const handleAudioSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/projects/${projectId}/upload-audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAudioFile({ name: file.name, url: res.data.url });
    } catch (err) {
      console.error('Audio upload failed:', err);
      const localUrl = URL.createObjectURL(file);
      setAudioFile({ name: file.name, url: localUrl });
      toast('Audio stored locally (Cloudinary not configured)', 'warning');
    } finally {
      setAudioUploading(false);
    }
  };

  const handleRemoveAudio = () => {
    setAudioFile(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const name = `Audio ${recordings.length + 1}`;
        setRecordings(prev => [...prev, { name, url, blob }]);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setPaused(false);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast('Microphone access denied', 'error');
    }
  };

  const pauseRecording = () => {
    if (!mediaRecorder) return;
    if (paused) {
      mediaRecorder.resume();
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      setPaused(false);
    } else {
      mediaRecorder.pause();
      clearInterval(timerRef.current);
      setPaused(true);
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
    setPaused(false);
    clearInterval(timerRef.current);
  };

  const saveRecording = () => {
    // Already saved to recordings list on stop — this just confirms
    stopRecording();
  };

  const deleteRecording = (index) => {
    setRecordings(prev => prev.filter((_, i) => i !== index));
  };

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

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Form completion check ───────────────────────────────────
  const isFormComplete = uploadType === 'pdf'
    ? !!pdfUrl
    : (!!audioFile || recordings.length > 0);

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (uploadType === 'pdf' && !scriptText.trim() && !pdfUrl) {
      toast('Please upload a PDF or add script text before submitting', 'warning');
      return;
    }
    if (uploadType === 'audio' && !audioFile && recordings.length === 0) {
      toast('Please upload or record audio before submitting', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/projects/${projectId}/script`, {
        script_text: scriptText,
        additional_notes: additionalNotes,
      });

      if (uploadType === 'audio') {
        // Upload all recorded blobs to the server, then combine with the uploaded file
        const uploadedRecordings = await Promise.all(
          recordings.map(async (rec, i) => {
            if (!rec.blob) return rec; // already has a server URL
            const formData = new FormData();
            formData.append('file', rec.blob, `recording-${i + 1}.webm`);
            try {
              const res = await api.post(`/projects/${projectId}/upload-audio`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              return { name: rec.name, url: res.data.url };
            } catch {
              return { name: rec.name, url: rec.url }; // fallback to local blob URL
            }
          })
        );

        // Combine: uploaded file first, then all recordings
        const allAudioFiles = [
          ...(audioFile ? [{ name: audioFile.name, url: audioFile.url }] : []),
          ...uploadedRecordings,
        ];

        navigate(`/workspace/${workspaceId}/project/${projectId}/audio-preview`,
          { state: { workspaceName, audioFiles: allAudioFiles } });
      } else {
        await api.put(`/projects/${projectId}/status`, { status: 'processing' });
        navigate(`/workspace/${workspaceId}/project/${projectId}/submitted`,
          { state: { workspaceName } });
      }
    } catch (err) {
      console.error(err);
      toast('Failed to submit script', 'error');
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
            onClick={() => navigate(`/workspace/${workspaceId}/upload`, { state: { workspaceName } })}
            className="cursor-pointer"
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <span className="text-text-h1 text-[22px] lg:text-[34px] leading-12 font-medium truncate">{workspaceName} /</span>
          <span className="font-light text-[18px] lg:text-[30px] leading-10 text-[#A7A7A7] truncate">
            {uploadType === 'pdf' ? 'Upload Script (PDF)' : 'Upload Script (Audio)'}
          </span>
        </div>

        {/* Split panel */}
        <div className="flex flex-col lg:flex-row gap-6" style={{ minHeight: 'calc(100vh - 300px)' }}>

          {/* ── LEFT PANEL ── */}
          <div className="w-full lg:w-[650px] flex flex-col">

            {uploadType === 'pdf' ? (
              <>
                {/* Upload zone */}
                <div>
                  <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-3">
                    Upload your script here <span className="text-[#EA4335]">*</span>
                  </p>

                  {/* Dropzone */}
                  <div
                    onClick={() => !pdfFile && pdfInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-[6px] h-[165px] flex flex-col items-center justify-center mb-9 transition
                      ${pdfFile
                        ? 'border-brand-color bg-[#F2F8FF] cursor-default'
                        : 'border-brand-color bg-[#F2F8FF] cursor-pointer hover:bg-blue-50'
                      }`}
                  >
                    {pdfUploading ? (
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    ) : pdfFile ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemovePdf(); }}
                        // className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none"
                        >
                          <img src="/assets/icons/pdf-delete.svg" alt="" className='cursor-pointer absolute top-2 right-2' />
                        </button>
                        <div className="flex flex-col items-center">
                          <img src="/assets/icons/pdf-uploaded.svg" alt="" className='mb-[6px]' />
                          <p className="text-xs font-normal text-[#00B215] mb-1">Uploaded</p>
                          <p className="text-sm font-normal text-text-h2">{pdfFile.name}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <img src="/assets/icons/file-upload.svg" alt="" className="mb-[6px]" />
                        <p className="text-sm font-normal text-text-h2 mb-1">Choose a file or drag & drop it here</p>
                        <p className="text-xs font-normal text-[#B4B3B9] mb-1">(max 5MB Accepted format: jpg, png, pdf)</p>
                        <p className="text-xs font-normal text-brand-color">Browse File</p>
                      </>
                    )}
                  </div>
                  <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfSelect} />
                </div>

                {/* Upload Script button — blue filled, matches Figma */}
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className="self-start flex items-center gap-2 h-[38px] px-5 bg-brand-color hover:bg-blue-700 text-white text-[15px] leading-[18px] font-medium rounded-[6px] transition mb-[54px]"
                >
                  <img src="/assets/icons/upload-script-plus.svg" alt="" /> Upload Script
                </button>

                {/* Script text area */}
                <div className="flex flex-col flex-1">
                  <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-1">Add a script or notes</p>
                  <textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    className="flex-1 w-full px-4 py-3 border border-[#D9E1EC] rounded-[6px] font-normal text-[15px] leading-6 text-[#B4B3B9] placeholder-gray-400 focus:outline-none focus:border-brand-color focus:ring focus:ring-brand-color transition resize-none"
                    style={{ minHeight: '636px' }}
                  />
                </div>
              </>
            ) : (
              /* ── AUDIO UPLOAD + RECORD ── */
              <div className="flex flex-col">

                {/* Upload dropzone */}
                <div>
                  <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-3">Upload your audio file here</p>
                  <div
                    onClick={() => !audioFile && audioInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-[6px] h-[165px] flex flex-col items-center justify-center mb-9 transition
                      ${audioFile
                        ? 'border-brand-color bg-[#F2F8FF] cursor-default'
                        : 'border-brand-color bg-[#F2F8FF] cursor-pointer hover:bg-blue-50'
                      }`}
                  >
                    {audioUploading ? (
                      <div className="w-8 h-8 border-4 border-brand-color border-t-transparent rounded-full animate-spin" />
                    ) : audioFile ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveAudio(); }}
                        >
                          <img src="/assets/icons/pdf-delete.svg" alt="" className='cursor-pointer absolute top-2 right-2' />
                        </button>
                        <div className="flex flex-col items-center">
                          <img src="/assets/icons/audio-file-uploaded.svg" alt="" className='mb-[6px]' />
                          <p className="text-xs font-normal text-[#00B215] mb-1">Uploaded</p>
                          <p className="text-sm font-normal text-text-h2">{audioFile.name}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <img src="/assets/icons/audio-file-upload.svg" alt="" className="mb-1" />
                        <p className="text-sm font-normal text-text-h2 mb-1">Drop your audio file here</p>
                        <p className="text-xs font-normal text-brand-color mb-1">Browse File</p>
                        <p className="text-xs font-normal text-[#B4B3B9]">(supports MP3, WAV, FLAC and more)</p>
                      </>
                    )}
                  </div>
                  <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                </div>

                {/* Upload Script button */}
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className="self-start flex items-center gap-2 h-[38px] px-5 bg-brand-color hover:bg-blue-700 text-white text-[15px] leading-[18px] font-medium rounded-[6px] transition mb-[54px]"
                >
                  <img src="/assets/icons/upload-script-plus.svg" alt="" /> Upload Script
                </button>

                {/* Record section */}
                <div>
                  <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-3">Record your audio here</p>

                  {/* Recording widget */}
                  <div className="border border-input-border rounded-[6px] p-4 mb-7">

                    {/* Active recording — shows label + waveform */}
                    {recording && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm leading-[150%] font-medium text-brand-color">
                          Audio {recordings.length + 1}
                        </span>
                        <button
                          onClick={stopRecording}
                          className='cursor-pointer'
                        >
                          <img src="/assets/icons/delete-audio-1.svg" alt="" />
                        </button>
                      </div>
                    )}

                    {/* Waveform / flat line */}
                    <div className="border border-gray-200 rounded-[6px] h-[52px] flex items-center px-3 mb-2 overflow-hidden">
                      {recording ? (
                        <WaveformDisplay active />
                      ) : (
                        <div className="w-full h-px bg-gray-200" />
                      )}
                    </div>

                    {/* Timer + controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-lg leading-[150%] text-[#4A4755]">{formatTime(recordingTime)}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {!recording ? (
                          <button
                            onClick={startRecording}
                            className="flex items-center gap-2 h-[38px] px-5 bg-brand-color hover:bg-blue-700 text-white text-sm leading-[150%] font-medium rounded-[6px] transition cursor-pointer"
                          >
                            <BsMicFill size={13} /> Record
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={pauseRecording}
                              className="flex items-center gap-1.5 h-[38px] px-4 bg-[#D9DDE9] hover:bg-gray-200 text-[#1E1E1E] text-sm font-medium rounded-[6px] transition cursor-pointer"
                            >
                              <img src="/assets/icons/pause-audio.svg" alt="" /> {paused ? 'Resume' : 'Pause'}
                            </button>
                            <button
                              onClick={stopRecording}
                              className="flex items-center gap-1.5 h-[38px] px-4 bg-[#D9DDE9] hover:bg-gray-200 text-[#1E1E1E] text-sm font-medium rounded-[6px] transition cursor-pointer"
                            >
                              <img src="/assets/icons/stop-audio.svg" alt="" /> Stop
                            </button>
                            <button
                              onClick={saveRecording}
                              className="flex items-center gap-2 h-[38px] px-5 bg-brand-color hover:bg-blue-700 text-white text-sm font-medium rounded-[6px] transition cursor-pointer"
                            >
                              <img src="/assets/icons/save-audio.svg" alt="" /> Save Audio
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Record multiple audio button */}
                  <button
                    onClick={startRecording}
                    disabled={recording}
                    className="flex items-center gap-2 h-[38px] px-5 bg-brand-color hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-[6px] transition mb-9"
                  >
                    <MdAdd size={16} /> Record multiple audio
                  </button>

                  {/* Saved recordings list */}
                  <div className="space-y-[18px]">
                    {recordings.map((rec, i) => (
                      <div key={i} className="border border-gray-200 rounded-[6px] py-2 px-3.5 text-end">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm leading-[150%] font-medium text-brand-color">{rec.name}</span>
                          <button
                            onClick={() => deleteRecording(i)}
                            className="cursor-pointer"
                          >
                            <img src="/assets/icons/delete-audio-2.svg" alt="" />
                          </button>
                        </div>
                        <div className="flex items-center bg-[#FAFBFF] rounded">
                          <button
                            onClick={() => togglePlay(i)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-brand-color transition shrink-0"
                          >
                            {playingIndex === i ? <MdPause size={16} className='cursor-pointer' /> : <img src='/assets/icons/audio-play.svg' alt='' className='cursor-pointer' />}
                          </button>
                          <audio ref={el => audioRefs.current[i] = el} src={rec.url} className="hidden" />
                          {/* Waveform bars */}
                          <div className="rounded-[6px] flex items-center gap-px flex-1 h-[52px] px-2 overflow-hidden">
                            <WaveformDisplay />
                          </div>
                        </div>
                        <span className="font-medium text-xs leading-[150%] text-[#4A4755]">{formatTime(Math.round(audioRefs.current[i]?.duration || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL — Additional Notes / Audio Preview ── */}
          <div className="flex-1 flex flex-col">
            <p className="font-normal text-lg leading-[130%] text-[#5D586C] mb-1">
              {uploadType === 'audio' ? 'Preview text of audio Extract' : 'Add Additional Notes'}
            </p>
            <textarea
              value={uploadType === 'audio' ? scriptText : additionalNotes}
              onChange={(e) => uploadType === 'audio'
                ? setScriptText(e.target.value)
                : setAdditionalNotes(e.target.value)
              }
              placeholder={uploadType === 'audio' ? '' : 'Input text'}
              readOnly={uploadType === 'audio'}
              className="flex-1 w-full px-4 py-3 border border-[#D9E1EC] rounded-[6px] font-normal text-[15px] leading-6 text-[#B4B3B9] placeholder-gray-400 focus:outline-none focus:border-brand-color focus:ring focus:ring-brand-color transition resize-none"
              style={{ minHeight: '560px' }}
            />
          </div>
        </div>

        {/* Bottom — Submit button bottom left */}
        <div className="mt-6">
          {(uploadType === 'pdf' || isFormComplete) && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !isFormComplete}
              className={`flex items-center gap-2 h-[38px] px-6 bg-brand-color text-white text-[15px] leading-[18px] font-medium rounded-[6px] transition
                ${isFormComplete ? 'opacity-100 hover:bg-blue-700 cursor-pointer' : 'opacity-65 cursor-not-allowed'}`}
            >
              {uploadType === 'audio'
                ? <MdSave size={18} />
                : <img src="/assets/icons/pdf-submit.svg" alt="" />
              }
              {submitting ? 'Submitting...' : uploadType === 'audio' ? 'Save and submit' : 'Submit'}
            </button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// ── Waveform component — clusters + dotted baseline from start to end ──
const CLUSTERS = 4;
const BARS_PER_CLUSTER = 18;

const clusterHeights = Array.from({ length: CLUSTERS }, (_, c) =>
  Array.from({ length: BARS_PER_CLUSTER }, (_, b) => {
    return Math.abs(Math.sin((c * 3.7 + b) * 0.55) * 18 + Math.sin((c * 2.1 + b) * 1.1) * 8) + 4;
  })
);

const WaveformDisplay = ({ active = false }) => (
  <div className="relative flex items-center w-full h-full overflow-hidden">
    {/* Continuous dotted baseline — runs full width behind everything */}
    <div className="absolute inset-x-0 flex items-center justify-between px-1" style={{ top: '50%', transform: 'translateY(-50%)' }}>
      {Array.from({ length: 120 }).map((_, i) => (
        <div key={i} className="w-px h-px rounded-full bg-brand-color opacity-50 shrink-0" />
      ))}
    </div>

    {/* Clusters + vertical markers on top of the dotted line */}
    <div className="relative flex items-center justify-between w-full h-full z-10">
      {Array.from({ length: CLUSTERS }).map((_, c) => (
        <div key={c} className="flex items-center gap-px">
          {/* Dense bar cluster */}
          {clusterHeights[c].map((h, b) => (
            <div
              key={b}
              className={`w-px rounded-full bg-brand-color ${active ? 'animate-pulse' : ''}`}
              style={{
                height: `${h}px`,
                animationDelay: active ? `${(c * BARS_PER_CLUSTER + b) * 0.02}s` : undefined,
                animationDuration: active ? `${0.5 + (b % 4) * 0.15}s` : undefined,
              }}
            />
          ))}
          {/* Vertical marker at end of cluster — with dot on top */}
          <div className="relative mx-0.5 shrink-0" style={{ width: '0.5px', height: '40px' }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-brand-color" />
            <div className="w-full h-full bg-brand-color" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ScriptEditor;
