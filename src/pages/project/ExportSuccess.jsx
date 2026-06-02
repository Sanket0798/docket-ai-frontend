import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MdDownload, MdFolderOpen, MdHome } from 'react-icons/md';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ExportSuccess = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const { toast } = useToast();

  const [downloading, setDownloading] = useState(false);

  // Dummy download — pulls the project + selected questions and packages them
  // as a JSON the user can save. Once the real video export pipeline lands,
  // this swaps for a streamed video/audio file from the backend.
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const [projectRes, questionsRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/questions`),
      ]);
      const payload = {
        project: projectRes.data,
        questions: questionsRes.data?.questions ?? questionsRes.data,
        exported_at: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectRes.data.name || 'project'}-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      toast('Download failed. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-[640px]">

        {/* Flying clock illustration */}
        <img
          src="/assets/icons/clock-flying.svg"
          alt="Video exported"
          className="mb-8"
        />

        {/* Heading */}
        <h1 className="font-bold text-[28px] lg:text-[40px] leading-tight text-[#3362CC] mb-3">
          Video Exported Successfully!
        </h1>

        {/* Subtitle */}
        <p className="font-light text-base lg:text-lg leading-7 text-[#5D586C] mb-8 max-w-[520px]">
          Your project is ready. Download it again, head back to refine your selections, or jump back to your workspaces.
        </p>

        {/* Primary action — Download again */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 h-[44px] px-7 bg-brand-color hover:bg-blue-700 disabled:opacity-60 text-white text-[15px] leading-[18px] font-medium rounded-[6px] transition cursor-pointer mb-5"
        >
          {downloading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <MdDownload size={18} />
          )}
          {downloading ? 'Preparing…' : 'Download again'}
        </button>

        {/* Secondary actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}/preview`,
              { state: { workspaceName } })}
            className="flex items-center justify-center gap-2 h-[42px] px-5 border border-brand-color text-brand-color hover:bg-blue-50 text-[15px] font-medium rounded-[6px] transition cursor-pointer"
          >
            <MdFolderOpen size={17} />
            Back to project
          </button>

          <button
            onClick={() => navigate(`/workspace/${workspaceId}`,
              { state: { workspaceName } })}
            className="flex items-center justify-center gap-2 h-[42px] px-5 border border-input-border text-text-h2 hover:bg-gray-50 text-[15px] font-medium rounded-[6px] transition cursor-pointer"
          >
            Back to workspace
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 h-[42px] px-5 border border-input-border text-text-h2 hover:bg-gray-50 text-[15px] font-medium rounded-[6px] transition cursor-pointer"
          >
            <MdHome size={17} />
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportSuccess;
