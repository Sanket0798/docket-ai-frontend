import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MdAdd, MdMoreVert, MdDelete, MdEdit, MdCheckCircle, MdAccessTime, MdError, MdPlayCircleOutline, MdAutorenew, MdRefresh } from 'react-icons/md';
import { HiOutlineDocument } from 'react-icons/hi';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';

const statusConfig = {
  draft:           { label: 'Draft',           icon: <MdEdit size={13} />,               cls: 'text-gray-500 bg-gray-100' },
  processing:      { label: 'Processing',      icon: <MdAutorenew size={13} className="animate-spin" />, cls: 'text-yellow-600 bg-yellow-50' },
  questions_ready: { label: 'Ready',           icon: <MdPlayCircleOutline size={13} />,  cls: 'text-blue-600 bg-blue-50' },
  in_progress:     { label: 'In Progress',     icon: <MdAccessTime size={13} />,         cls: 'text-indigo-600 bg-indigo-50' },
  completed:       { label: 'Completed',       icon: <MdCheckCircle size={13} />,        cls: 'text-green-600 bg-green-50' },
  failed:          { label: 'Failed',          icon: <MdError size={13} />,              cls: 'text-red-600 bg-red-50' },
};

const WorkspaceProjects = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const location = useLocation();
  const workspaceName = location.state?.workspaceName || 'Workspace';
  const { toast } = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 12;
  const [refreshing, setRefreshing] = useState(false);
  // Bumped on each refresh click so the icon's animation key changes and the
  // one-shot rotation replays even if clicks land back-to-back.
  const [spinTick, setSpinTick] = useState(0);

  const fetchProjects = async (p = page) => {
    try {
      const res = await api.get(`/projects/workspace/${workspaceId}`, { params: { page: p, limit: LIMIT } });
      setProjects(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
      toast('Failed to load projects. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(page); }, [workspaceId, page]);

  const handleManualRefresh = async () => {
    setSpinTick(t => t + 1);
    setRefreshing(true);
    try { await fetchProjects(page); }
    finally { setRefreshing(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post(`/projects/workspace/${workspaceId}`, { name: projectName });
      setShowModal(false);
      setProjectName('');
      setPage(1);
      fetchProjects(1);
      // Go to upload type selection for new project
      navigate(`/workspace/${workspaceId}/upload`,
        { state: { workspaceName, projectId: res.data.id } });
    } catch (err) {
      console.error(err);
      toast('Failed to create project. Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (project) => {
    setDeleteTarget(project);
    setMenuOpen(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast('Failed to delete project. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpen = (project) => {
    if (project.status === 'completed') {
      navigate(`/workspace/${workspaceId}/project/${project.id}/success`,
        { state: { workspaceName } });
    } else if (project.status === 'questions_ready' || project.status === 'in_progress') {
      // Project is ready for (or mid-way through) Q&A.
      navigate(`/workspace/${workspaceId}/project/${project.id}/questions`,
        { state: { workspaceName } });
    } else if (project.status === 'processing') {
      // Prep is still running — don't open Q&A yet.
      toast('Still preparing your questions. Try again in a moment.', 'info');
    } else if (project.status === 'failed') {
      // Send the user back to the editor so they can re-submit.
      navigate(`/workspace/${workspaceId}/project/${project.id}/editor`,
        { state: { workspaceName } });
    } else {
      // draft — let user choose upload type (PDF or Audio)
      navigate(`/workspace/${workspaceId}/upload`,
        { state: { workspaceName, projectId: project.id } });
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <button onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 transition">
            ← Dashboard
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-semibold">{workspaceName}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">{workspaceName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 h-[38px] px-4 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 active:scale-95 disabled:opacity-60 text-gray-700 text-sm font-medium rounded-lg transition"
            >
              <MdRefresh key={spinTick} size={16} className={spinTick > 0 ? 'animate-spin-once' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 h-[38px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
            >
              <MdAdd size={18} /> New Project
            </button>
          </div>
        </div>

        {/* Projects grid */}
        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <HiOutlineDocument size={52} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No projects yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first project to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 flex items-center gap-2 h-[38px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
            >
              <MdAdd size={18} /> New Project
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map((project) => {
              const status = statusConfig[project.status] || statusConfig.draft;
              return (
                <div key={project.id}
                  className="relative border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition group cursor-pointer"
                  onClick={() => handleOpen(project)}
                >
                  {/* 3-dot menu */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === project.id ? null : project.id); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition"
                    >
                      <MdMoreVert size={18} />
                    </button>
                    {menuOpen === project.id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[130px]">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(project); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <MdDelete size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                    <HiOutlineDocument size={20} className="text-indigo-600" />
                  </div>

                  {/* Name */}
                  <p className="font-semibold text-gray-900 text-sm truncate mb-2 pr-6">{project.name}</p>

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-3 ${status.cls}`}>
                    {status.icon} {status.label}
                  </span>

                  {/* Date */}
                  <p className="text-xs text-gray-400">{formatDate(project.created_at)}</p>
                </div>
              );
            })}

            {/* Add new card */}
            <button
              onClick={() => setShowModal(true)}
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50 transition min-h-[140px]"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <MdAdd size={22} className="text-gray-400" />
              </div>
              <span className="text-sm text-gray-400 font-medium">New Project</span>
            </button>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </main>

      <Footer />

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. Product Launch Video"
                  required
                  autoFocus
                  className="w-full h-[42px] px-4 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="h-[38px] px-5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="h-[38px] px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                  {creating
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />}

      {/* Delete Project Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-[6px] w-full max-w-[480px] px-6 py-10 flex flex-col items-center text-center shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <img src="/assets/icons/delete-workspace.svg" alt="" className="mb-5 w-12 h-12" />
            <h2 className="font-medium text-[22px] leading-[28px] text-secondary-text mb-2">
              Delete Project?
            </h2>
            <p className="font-light text-base text-[#787889] mb-8 max-w-sm">
              Are you sure you want to delete <span className="font-medium text-secondary-text">"{deleteTarget.name}"</span>?
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-[38px] w-[130px] border border-gray-300 text-gray-600 text-[15px] font-medium rounded-[6px] hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-[38px] w-[130px] bg-[#B24E4E] hover:bg-red-700 disabled:opacity-60 text-white text-[15px] font-medium rounded-[6px] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {deleting
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Delete'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceProjects;
