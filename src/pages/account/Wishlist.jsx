import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineDocument } from 'react-icons/hi';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';

const Wishlist = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 12;

  // Select project modal
  const [showSelectProject, setShowSelectProject] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [using, setUsing] = useState(false);

  // Success modal
  const [successMsg, setSuccessMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch wishlist
  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await api.get('/wishlist', { params: { search, sort, page, limit: LIMIT } });
      setItems(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWishlist(); }, [search, sort, page]);

  // Fetch all user projects for the select modal — load all pages
  const fetchProjects = async () => {
    try {
      const wsRes = await api.get('/workspaces', { params: { limit: 50 } });
      const allProjects = [];
      for (const ws of wsRes.data.data) {
        const pRes = await api.get(`/projects/workspace/${ws.id}`, { params: { limit: 50 } });
        allProjects.push(...pRes.data.data.map(p => ({ ...p, workspaceName: ws.name })));
      }
      setProjects(allProjects);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUseClick = (itemId) => {
    setActiveItemId(itemId);
    setSelectedProjectId(null);
    fetchProjects();
    setShowSelectProject(true);
  };

  const handleAddToProject = async () => {
    if (!selectedProjectId) return;
    setUsing(true);
    try {
      const res = await api.post(`/wishlist/${activeItemId}/use`, {
        target_project_id: selectedProjectId,
      });
      setShowSelectProject(false);
      setSuccessMsg(res.data.message);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      toast('Failed to add to project', 'error');
    } finally {
      setUsing(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/wishlist/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
      toast('Failed to delete', 'error');
    }
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 lg:px-[60px] py-8">
        {/* Heading */}
        <h1 className="text-[24px] lg:text-[34px] font-medium text-text-h1 mb-6">My Wishlist</h1>

        {/* Search bar with Sort + Filter inside */}
        <div className="flex items-center gap-3 border border-input-border rounded-[6px] px-3 h-[51px] mb-6">
          <img src="/assets/icons/search.svg" alt="" className="shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="flex-1 min-w-0 font-normal text-[15px] leading-6 placeholder-gray-400 focus:outline-none"
          />
          {/* Sort button */}
          <button
            onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-[10px] px-3 h-[30px] border border-brand-color text-brand-color text-sm font-medium leading-[18px] rounded-[6px] hover:bg-blue-50 transition shrink-0 cursor-pointer"
          >
            Sort
            <img src="/assets/icons/sort.svg" alt="" />
          </button>
          {/* Filter button */}
          <button className="flex items-center gap-[10px] px-3 h-[30px] border border-brand-color text-brand-color text-sm font-medium leading-[18px] rounded-[6px] hover:bg-blue-50 transition shrink-0 cursor-pointer">
            Filter
            <img src="/assets/icons/filter.svg" alt="" />
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[220px] bg-gray-100 rounded-[6px] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <img src="/assets/icons/wishlist-heart.svg" alt="" className="w-16 h-16 opacity-30 mb-4" />
            <p className="text-gray-500 font-medium">Your wishlist is empty</p>
            <p className="text-gray-400 text-sm mt-1">Save AI-generated images from the preview page</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative rounded overflow-hidden group" style={{ aspectRatio: '4/3' }}>
                {/* Full image fills card */}
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <img src="/assets/project/AI-Image.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}

                {/* Bottom overlay — gradient + name + tags + buttons */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-16 bg-linear-to-t from-black/50 to-transparent">
                  {/* Project name */}
                  <p className="font-normal text-xl text-white mb-1">
                    {item.project_name || 'my project'}
                  </p>

                  {/* Tags */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {(item.tags || 'Lighting,Mood').split(',').slice(0, 2).map((tag, i) => (
                      <span
                        key={i}
                        className="font-normal text-[6px] bg-[#DCDCDC] px-[11px] py-[2px] rounded-full"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>

                  {/* Use + Delete buttons */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleUseClick(item.id)}
                      className="w-[75px] h-[21px] bg-brand-color hover:bg-blue-700 text-white text-[10px] leading-[11px] font-medium rounded transition cursor-pointer"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-[75px] h-[21px] bg-[#D9DDE9] text-black text-[10px] leading-[11px] font-medium rounded transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>

      <Footer />

      {/* ── Select Project Modal ── */}
      {showSelectProject && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
          onClick={() => setShowSelectProject(false)}
        >
          <div
            className="bg-white rounded-[6px] w-full max-w-[748px] max-h-screen overflow-y-auto mx-4 py-8 px-6 lg:px-[49px] shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-medium text-xl leading-[28px] text-black mb-8" style={{ fontFamily: 'Urbanist, sans-serif' }}>Select Project</h2>

            {/* Projects grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 lg:gap-y-[27px] lg:max-w-[650px] max-h-[400px] overflow-y-auto mb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {projects.length === 0 ? (
                <p className="col-span-2 text-center text-gray-400 text-sm py-8">No projects found</p>
              ) : (
                projects.map((project) => {
                  const isSelected = selectedProjectId === project.id;
                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`flex items-center gap-[14px] py-4 px-3 rounded-[6px] border text-left h-[82px] cursor-pointer transition
                        ${isSelected
                          ? 'bg-[#E5E5E5] border-[#948F8F] border-dashed'
                          : 'bg-[#F2F8FF] border-brand-color border-dashed hover:bg-blue-50'
                        }`}
                    >
                      <div className="">
                        <img src="/assets/icons/page.svg" alt="" />
                      </div>
                      <div className="min-w-0 font-normal">
                        <p className="text-base text-brand-color truncate">{project.name}</p>
                        <p className="text-xs text-text-h2">{formatTime(project.created_at)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Add button */}
            <button
              onClick={handleAddToProject}
              disabled={!selectedProjectId || using}
              className="flex items-center justify-center gap-2 w-[122px] h-[38px] px-6 bg-brand-color hover:bg-blue-700 disabled:opacity-50 text-white text-[15px] font-medium rounded-[6px] transition cursor-pointer"
            >
              {using && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <img src="/assets/icons/plus.svg" alt="" /> Add
            </button>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-[6px] w-full max-w-[560px] lg:max-w-[1128px] lg:h-[360px] mx-4 px-6 py-10 shadow-xl flex flex-col items-center justify-center text-center">
            <img src="/assets/icons/check_circle.svg" alt="" className='mb-4 lg:mb-[35px]' />
            <p className="font-medium text-lg lg:text-[28px] leading-[22px] lg:leading-5 text-secondary-text" style={{ fontFamily: 'Geist, sans-serif' }}>{successMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wishlist;
