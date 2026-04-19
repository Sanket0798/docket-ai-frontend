import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const ScriptSubmitted = () => {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'my_workspace';

  // Auto-redirect to AI questions after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(`/workspace/${workspaceId}/project/${projectId}/questions`,
        { state: { workspaceName } });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

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
