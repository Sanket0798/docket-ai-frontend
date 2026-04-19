import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { BsFilePdf, BsMicFill } from 'react-icons/bs';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const UploadScript = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const existingProjectId = location.state?.projectId || null;
  const { toast } = useToast();

  const [creating, setCreating] = useState(false);

  const handleChoice = async (type) => {
    setCreating(true);
    try {
      let projectId = existingProjectId;

      // Only create a new project if one wasn't passed in
      if (!projectId) {
        // Generate a readable default name based on date
        const defaultName = `Project ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        const res = await api.post(`/projects/workspace/${workspaceId}`, {
          name: defaultName,
        });
        projectId = res.data.id;
      }

      navigate(
        `/workspace/${workspaceId}/project/${projectId}/editor`,
        { state: { workspaceName, uploadType: type } }
      );
    } catch (err) {
      console.error(err);
      toast('Failed to create project. Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] py-[51px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-9">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}`, { state: { workspaceName } })}
            className='cursor-pointer'
          >
            <img src="/assets/icons/back-arrow.svg" alt="back" />
          </button>
          <span className="text-text-h1 text-[22px] lg:text-[34px] leading-12 font-medium truncate">{workspaceName} /</span>
          <span className="font-light text-[18px] lg:text-[30px] leading-10 text-[#A7A7A7] truncate">New Project</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-9">
          <h1 className="text-text-h1 font-medium text-[20px] lg:text-[26px] leading-9 mb-[6px]">
            Choose a way to upload a script
          </h1>
          <p className="text-[15px] text-text-h2 leading-[22px] font-normal">
            Select the script upload method
          </p>
        </div>

        {/* Choice cards */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 lg:gap-7">
          {/* PDF */}
          <button
            onClick={() => handleChoice('pdf')}
            disabled={creating}
            className="group flex flex-col items-center justify-center gap-4 w-full sm:w-[365px] h-[163px] border border-[#818181]/50 rounded hover:border-indigo-400 hover:bg-[#F9F9F9] cursor-pointer transition disabled:opacity-50"
          >
            <img src="/assets/icons/pdf-upload.svg" alt="" />
            <span className="font-medium text-xl leading-7 text-[#525252] group-hover:text-brand-color transition">
              Upload a PDF file
            </span>
          </button>

          {/* Audio */}
          <button
            onClick={() => handleChoice('audio')}
            disabled={creating}
            className="group flex flex-col items-center justify-center gap-4 w-full sm:w-[365px] h-[163px] border border-[#818181]/50 rounded hover:border-indigo-400 hover:bg-[#F9F9F9] cursor-pointer transition disabled:opacity-50"
          >
            <img src="/assets/icons/mp3-upload.svg" alt="" />
            <span className="font-medium text-xl leading-7 text-[#525252] group-hover:text-brand-color transition">
              Upload an Audio file
            </span>
          </button>
        </div>

        {creating && (
          <div className="flex justify-center mt-8">
            <div className="w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default UploadScript;
