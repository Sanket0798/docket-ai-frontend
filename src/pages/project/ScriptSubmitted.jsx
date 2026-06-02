import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ScriptSubmitted = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';
  const { toast } = useToast();
  const startedRef = useRef(false);

  // Kick off question generation prep, then redirect to the Q&A screen.
  // The prep endpoint flips project status to 'questions_ready' (today it's a
  // no-op while real AI is still being wired). Once the real pipeline lands,
  // this will return a job id and we'll poll status before navigating.
  //
  // No cleanup-based cancel here — React StrictMode runs effects twice, and a
  // closed-over "cancelled" flag from the first invocation would block the
  // setTimeout's navigate. The startedRef guard is enough.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    api.post(`/projects/${projectId}/questions/prep`)
      .catch(err => {
        console.error('Prep failed:', err);
        toast('Failed to prepare questions. You can still proceed.', 'warning');
      })
      .finally(() => {
        setTimeout(() => {
          navigate(`/workspace/${workspaceId}/project/${projectId}/questions`,
            { state: { workspaceName } });
        }, 1500);
      });
  }, [projectId]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-[600px]">

        {/* Film rolls illustration */}
        <img
          src="/assets/icons/film-rolls.svg"
          alt="Film rolls"
          className="w-[200px] lg:w-[376px] mb-8"
        />

        {/* Heading */}
        <h1 className="text-[22px] lg:text-[28px] font-bold text-brand-color mb-3">
          Your script is been submitted!
        </h1>

        {/* Sub text */}
        <p className="text-[15px] font-normal text-[#4A4755] mb-1">
          analyzing your script pls wait
        </p>
        <p className="text-[14px] font-normal text-[#4A4755]">
          redirecting to next step......
        </p>
      </div>
    </div>
  );
};

export default ScriptSubmitted;
