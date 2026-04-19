import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdMoreVert, MdDelete } from 'react-icons/md';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [menuOpen, setMenuOpen] = useState(null);
  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null); // workspace object to delete
  const [deleting, setDeleting] = useState(false);
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 12;

  const fetchWorkspaces = async (p = page) => {
    try {
      const res = await api.get('/workspaces', { params: { page: p, limit: LIMIT } });
      setWorkspaces(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
      toast('Failed to load workspaces. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkspaces(page); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setShowModal(false);
    setShowProcessing(true);
    try {
      await api.post('/workspaces', form);
      // await Promise.all([
      //   api.post('/workspaces', form),
      //   new Promise(r => setTimeout(r, 2000)), // min 2s so user sees the popup
      // ]);
      setForm({ name: '', description: '' });
      // Show success popup
      setShowProcessing(false);
      setShowSuccess(true);
      // Auto-close success after 2s and refresh
      setTimeout(() => {
        setShowSuccess(false);
        setPage(1);
        fetchWorkspaces(1);
      }, 2000);
    } catch (err) {
      console.error(err);
      setShowProcessing(false);
    } finally {
      setCreating(false);
    }
  };

  // Opens the delete confirmation modal
  const handleDelete = (ws) => {
    setDeleteTarget(ws);
    setMenuOpen(null);
  };

  // Called when user confirms deletion inside the modal
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/workspaces/${deleteTarget.id}`);
      setWorkspaces(prev => prev.filter(w => w.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast('Failed to delete workspace. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };


  const handleOpen = (ws) => {
    navigate(`/workspace/${ws.id}`, { state: { workspaceName: ws.name } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Workspace grid */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center my-12 lg:my-[147px]">
            <img src="/assets/icons/Empty-cuate.svg" alt="No workspaces" className="mb-6" />
            <p className="font-regular text-3xl text-[#1B1B1D] mb-2" style={{ fontFamily: 'Urbanist, sans-serif' }}>No Workspace Yet</p>
            <p className="font-normal text-[19px] text-[#787889] mb-6" style={{ fontFamily: 'Urbanist, sans-serif' }}>Create your videos in new workspace</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 h-[38px] px-5 bg-brand-color text-white text-[15px] leading-[18px] font-medium rounded-[6px] hover:opacity-90 transition cursor-pointer"
            >
              Create workspace
              <img src="assets/icons/plus.svg" alt="" />
            </button>
          </div>
        ) : (
          <>
            <div className='flex flex-col px-4 lg:px-[60px] my-[18px]'>
              <div className="flex items-center justify-between mb-9">
                <h1 className="text-[22px] lg:text-[34px] font-medium leading-[48px] text-[#4A4755]">My Workspaces</h1>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 h-[38px] px-5 bg-brand-color hover:bg-indigo-700 text-white font-medium text-[15px] leading-[18px] rounded-[6px] transition cursor-pointer"
                >
                  Create Workspace
                  <img src="assets/icons/plus.svg" alt="" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className="relative flex items-center justify-between border-2 border-dashed border-brand-color rounded-[6px] px-4 py-3 bg-[#F2F8FF] group hover:bg-[#E8EBFF] transition min-w-0"
                  >
                    {/* Page icon */}
                    <div className='flex flex-row items-center gap-x-[14px] min-w-0 overflow-hidden'>
                      <img
                        src="/assets/icons/page.svg"
                        alt="workspace"
                        className="shrink-0"
                      />

                      {/* Name & meta */}
                      <div className="min-w-0 font-normal">
                        <p className="text-brand-color text-base truncate">{ws.name}</p>
                        <p className="text-xs text-text-h2">
                          {ws.project_count || 0} project{ws.project_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Open button */}
                    <div className='flex items-center justify-end gap-2'>
                      <button
                        onClick={() => handleOpen(ws)}
                        className="shrink-0 h-7 px-3 border border-brand-color text-brand-color rounded-[7px] font-medium text-[10px] leading-[16px] bg-transparent hover:bg-indigo-50 transition cursor-pointer"
                      >
                        View
                      </button>

                      {/* 3-dot menu */}
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === ws.id ? null : ws.id); }}
                          className="w-4 h-4 flex items-center justify-center rounded-[4px] hover:bg-indigo-100 text-gray-400 transition cursor-pointer"
                        >
                          <MdMoreVert size={16} />
                        </button>
                        {menuOpen === ws.id && (
                          <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[130px]">
                            <button
                              onClick={() => handleDelete(ws)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#B24E4E] hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <img src="assets/icons/delete-workspace.svg" alt="" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add new card */}
                {/* <button
                  onClick={() => setShowModal(true)}
                  className="border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-indigo-300 hover:bg-indigo-50 transition"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <MdAdd size={20} className="text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-400 font-medium">New Workspace</span>
                </button> */}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </main>

      <Footer />

      {/* Create Workspace Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-[6px] w-full max-w-[594px] h-[414px] flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-secondary-text/20 border-b">
              <h2 className="font-medium text-[22px] leading-[24px] text-secondary-text" style={{ fontFamily: 'Geist, sans-serif' }}>Create Workspace</h2>
              <button
                onClick={() => setShowModal(false)}
              // className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-xl"
              >
                <img src="assets/icons/cancel-outline.svg" alt="" className='cursor-pointer' />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreate} className="px-6 space-y-4">
              <div>
                <label className="block font-normal text-xs text-secondary-text mb-1" style={{ fontFamily: 'Geist, sans-serif' }}>
                  Workspace Name <span className="text-[#FF2B2F]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. My Brand Videos"
                  required
                  style={{ fontFamily: 'Geist, sans-serif' }}
                  className="w-full h-[40px] px-4 border border-[#EFEFEF]/80 rounded-[6px] font-normal text-[15px] leading-6 placeholder-secondary-text/40 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block font-normal text-xs text-secondary-text mb-1" style={{ fontFamily: 'Geist, sans-serif' }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this workspace for?"
                  rows={3}
                  style={{ fontFamily: 'Geist, sans-serif' }}
                  className="w-full px-4 py-3 h-[125px] border border-[#EFEFEF]/80 rounded-[6px] font-normal text-[15px] leading-6 placeholder-secondary-text/40 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="cursor-pointer"
                >
                  <img src="assets/icons/delete-workspace.svg" alt="" />
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-[38px] w-[121px] justify-center bg-brand-color disabled:opacity-60 text-white font-medium text-[15px] leading-[18px] rounded-[6px] transition flex items-center gap-2 cursor-pointer"
                >
                  {creating ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Create
                      <img src="assets/icons/arrow-right.svg" alt="" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
      )}

      {/* Delete Workspace Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-[6px] w-full max-w-[560px] px-6 py-10 flex flex-col items-center text-center shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <img src="/assets/icons/delete-workspace.svg" alt="" className="mb-5 w-12 h-12" />
            <h2 className="font-medium text-[22px] leading-[28px] text-secondary-text mb-2">
              Delete Workspace?
            </h2>
            <p className="font-light text-base text-[#787889] mb-8 max-w-sm">
              Are you sure you want to delete <span className="font-medium text-secondary-text">"{deleteTarget.name}"</span>?
              This will permanently delete all projects inside it.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-[38px] w-[140px] border border-gray-300 text-gray-600 text-[15px] font-medium rounded-[6px] hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-[38px] w-[140px] bg-[#B24E4E] hover:bg-red-700 disabled:opacity-60 text-white text-[15px] font-medium rounded-[6px] transition flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Processing popup */}
      {showProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[6px] shadow-xl px-6 py-6 lg:px-10 flex flex-col items-center gap-4 w-full max-w-[594px] mx-4">
            <img
              src="/assets/icons/ultimate_loading.svg"
              alt="Loading"
              className="animate-spin"
            />
            <hr className="w-full border-t border-[#EFEFEF]/60 mb-2" />
            <p className="font-light text-[22px] lg:text-[32px] text-[#484848] text-center">Please wait while we process</p>
            <p className="text-base lg:text-lg font-light text-[#484848] text-center">Do not refresh the page.....</p>
          </div>
        </div>
      )}

      {/* Success popup */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[18px] shadow-xl px-6 py-8 lg:px-10 flex flex-col items-center justify-center gap-6 w-full max-w-[560px] mx-4 lg:max-w-[1128px] lg:h-[340px]">
            <div className='rounded-full w-[75px] h-[75px]'>
              <img
                src="/assets/icons/check_circle.svg"
                alt="Success"
              />
            </div>
            <div className="text-center space-y-4">
              <p className="font-medium text-[22px] lg:text-[32px] leading-[24px] text-secondary-text text-center">Workspace created successfully</p>
              <p className="font-light text-base lg:text-lg leading-[24px] px-2 lg:px-10 text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod <br className="hidden lg:block" /> tempor incididunt ut labore et dolore magna aliqua.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
