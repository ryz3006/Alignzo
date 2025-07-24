import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { MdDelete, MdImage, MdPerson, MdLabel, MdEdit } from 'react-icons/md';
import { fetchAllProjects } from '../../api/projects';
import { API_BASE_URL } from '../../config';
import dayjs from 'dayjs';
import { fetchEscalationMatrix, getCurrentUser } from '../../api/users';
import { createRating, fetchRatings, updateRating, deleteRating } from '../../api/ratings';

const PAGE_SIZE = 10;

// MultiCheckboxDropdown copied from UserManagement
function MultiCheckboxDropdown({ options, selected, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };
  return (
    <div style={{ position: 'relative', width: '100%', minWidth: 160, marginBottom: 0 }} ref={ref}>
      <label style={{ fontWeight: 500, color: 'var(--primary-color)', marginBottom: 4, display: 'block', fontSize: 15 }}>{label}</label>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          border: '1px solid var(--primary-shadow)',
          borderRadius: 6,
          background: 'var(--primary-bg)',
          color: 'var(--primary-color)',
          padding: '8px 12px',
          minHeight: 40,
          height: 40,
          cursor: 'pointer',
          fontFamily: "'FK Grotesk', Arial, sans-serif",
          userSelect: 'none',
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box', // Added for consistent sizing
        }}
      >
        {selected.length === 0
          ? 'Select projects...'
          : options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')}
        <span style={{ float: 'right', fontWeight: 700, fontSize: 18, marginLeft: 8 }}>{open ? '\u25B2' : '\u25BC'}</span>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            maxHeight: 180,
            overflowY: 'auto',
            background: 'var(--primary-bg)',
            border: '1px solid var(--primary-shadow)',
            borderRadius: 6,
            zIndex: 1001,
            boxShadow: '0 4px 16px #0002',
            marginTop: 2,
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: 8, color: '#888' }}>No options</div>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                cursor: 'pointer',
                fontFamily: "'FK Grotesk', Arial, sans-serif",
                background: selected.includes(opt.value) ? 'var(--primary-highlight)' : 'transparent',
                borderRadius: 4,
                marginBottom: 2,
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggleOption(opt.value)}
                style={{ marginRight: 8 }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const UserFeeds = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editModal, setEditModal] = useState({ open: false, post: null });
  const [editLoading, setEditLoading] = useState(false);
  const [ribbonMessage, setRibbonMessage] = useState("");
  const [ribbonType, setRibbonType] = useState("success"); // 'success' or 'error'
  const [imageModal, setImageModal] = useState({ open: false, src: null });
  const [filterProjects, setFilterProjects] = useState([]);
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterPreset, setFilterPreset] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingProject, setRatingProject] = useState('');
  const [ratingMembers, setRatingMembers] = useState([]);
  const [ratingRatee, setRatingRatee] = useState('');
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSearch, setRatingSearch] = useState('');
  const [ratings, setRatings] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [editRatingModal, setEditRatingModal] = useState({ open: false, rating: null });
  const [editRatingValue, setEditRatingValue] = useState(0);
  const [editRatingComment, setEditRatingComment] = useState('');
  const [editRatingLoading, setEditRatingLoading] = useState(false);

  // Fetch current user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const user = await getCurrentUser(token);
        setCurrentUserId(user.id);
        localStorage.setItem('adminUserId', JSON.stringify(user.id));
      } catch {}
    };
    fetchUser();
  }, []);

  // Fetch all posts and projects on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('adminToken');
        const [postsRes, projectsRes] = await Promise.all([
          axios.get('/api/posts/all', { headers: { Authorization: `Bearer ${token}` } }),
          fetchAllProjects(token),
        ]);
        setPosts(postsRes.data.posts);
        setProjects(projectsRes.projects || []);
      } catch (e) {
        setError('Failed to fetch posts or projects');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter logic
  useEffect(() => {
    let filtered = posts;
    if (filterProjects.length > 0) filtered = filtered.filter(p => filterProjects.includes(String(p.project_id)));
    if (filterAuthor) filtered = filtered.filter(p => (p.author_email || '').toLowerCase().includes(filterAuthor.toLowerCase()));
    if (filterPreset) {
      const now = dayjs();
      let from = null;
      if (filterPreset === '5min') from = now.subtract(5, 'minute');
      else if (filterPreset === '1hr') from = now.subtract(1, 'hour');
      else if (filterPreset === 'today') from = now.startOf('day');
      if (from) filtered = filtered.filter(p => dayjs(p.created_at).isAfter(from));
    } else if (filterFrom && filterTo) {
      filtered = filtered.filter(p => dayjs(p.created_at).isAfter(dayjs(filterFrom)) && dayjs(p.created_at).isBefore(dayjs(filterTo)));
    }
    setFilteredPosts(filtered);
  }, [posts, filterProjects, filterAuthor, filterPreset, filterFrom, filterTo]);

  // Pagination logic (client-side)
  const total = filteredPosts.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedPosts = filteredPosts.slice((page - 1) * limit, page * limit);

  // Delete post
  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setDeleting(postId);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      alert('Failed to delete post');
    } finally {
      setDeleting(null);
    }
  };

  // Delete tag from post
  const handleDeleteTag = async (postId, userId) => {
    if (!window.confirm('Remove this tag from the post?')) return;
    setEditLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE_URL}/posts/post_tags/${postId}/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, tags: p.tags.filter(t => t.id !== userId) } : p));
      setEditModal(m => ({ ...m, post: { ...m.post, tags: m.post.tags.filter(t => t.id !== userId) } }));
      setRibbonType('success');
      setRibbonMessage('Tag removed successfully.');
    } catch (e) {
      setRibbonType('error');
      setRibbonMessage('Failed to remove tag.');
    } finally {
      setEditLoading(false);
      setTimeout(() => setRibbonMessage(""), 2500);
    }
  };

  // Delete image from post
  const handleDeleteImage = async (postId, filePath) => {
    if (!window.confirm('Remove this image from the post?')) return;
    setEditLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE_URL}/posts/post_images/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { file_path: filePath },
      });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, images: p.images.filter(img => img !== filePath) } : p));
      setEditModal(m => ({ ...m, post: { ...m.post, images: m.post.images.filter(img => img !== filePath) } }));
      setRibbonType('success');
      setRibbonMessage('Image removed successfully.');
    } catch (e) {
      setRibBbonType('error');
      setRibbonMessage('Failed to remove image.');
    } finally {
      setEditLoading(false);
      setTimeout(() => setRibbonMessage(""), 2500);
    }
  };

  // Add appreciation/rating post to feed
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!ratingProject || !ratingRatee) return;
    setRatingLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      // For demo, use admin as rater (replace with actual user if available)
      const rater_id = JSON.parse(localStorage.getItem('adminUserId') || '0') || 0;
      const newRating = await createRating({
        project_id: ratingProject,
        rater_id,
        ratee_id: ratingRatee,
        value: ratingValue,
        comment: ratingComment,
        token,
      });
      setRatings(r => [newRating, ...r]);
      setShowRatingModal(false);
      setRibbonType('success');
      setRibbonMessage('Appreciation/Rating submitted!');
      setTimeout(() => setRibbonMessage(''), 2500);
      setRatingProject('');
      setRatingRatee('');
      setRatingValue(0);
      setRatingComment('');
      setRatingMembers([]);
    } catch (e) {
      setRibbonType('error');
      setRibbonMessage('Failed to submit appreciation/rating.');
      setTimeout(() => setRibbonMessage(''), 2500);
    } finally {
      setRatingLoading(false);
    }
  };

  // Fetch ratings on mount
  useEffect(() => {
    const fetchAllRatings = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const ratingsList = await fetchRatings({ token });
        setRatings(ratingsList);
      } catch {}
    };
    fetchAllRatings();
  }, []);

  // Fetch project members when project changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (!ratingProject) return setRatingMembers([]);
      try {
        const token = localStorage.getItem('adminToken');
        const data = await fetchEscalationMatrix(token, ratingProject);
        setRatingMembers(data.escalationMatrix || []);
      } catch { setRatingMembers([]); }
    };
    fetchMembers();
  }, [ratingProject]);

  // Helper: flatten subtree of escalation matrix rooted at current user
  function getUnderUsers(members, userId) {
    const map = {};
    members.forEach(m => { map[m.user_id] = { ...m, subordinates: [] }; });
    members.forEach(m => {
      if (m.manager_id && map[m.manager_id]) {
        map[m.manager_id].subordinates.push(map[m.user_id]);
      }
    });
    function collectSubtree(node) {
      let result = [];
      for (const sub of node.subordinates) {
        result.push(sub);
        result = result.concat(collectSubtree(sub));
      }
      return result;
    }
    const root = map[userId];
    if (!root) return [];
    return collectSubtree(root);
  }

  // In rating modal, filter members to only those under current user
  const filteredRatingMembers = ratingProject && currentUserId
    ? getUnderUsers(ratingMembers, currentUserId)
    : ratingMembers;

  // Edit rating logic
  const openEditRating = (rating) => {
    setEditRatingModal({ open: true, rating });
    setEditRatingValue(rating.value);
    setEditRatingComment(rating.comment || '');
  };
  const handleEditRating = async (e) => {
    e.preventDefault();
    setEditRatingLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const updated = await updateRating({
        id: editRatingModal.rating.id,
        rater_id: currentUserId,
        value: editRatingValue,
        comment: editRatingComment,
        token,
      });
      setRatings(ratings => ratings.map(r => r.id === updated.id ? updated : r));
      setEditRatingModal({ open: false, rating: null });
      setRibbonType('success');
      setRibbonMessage('Rating updated!');
      setTimeout(() => setRibbonMessage(''), 2500);
    } catch {
      setRibbonType('error');
      setRibbonMessage('Failed to update rating.');
      setTimeout(() => setRibbonMessage(''), 2500);
    } finally {
      setEditRatingLoading(false);
    }
  };
  const handleDeleteRating = async (id) => {
    if (!window.confirm('Delete this rating?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await deleteRating({ id, rater_id: currentUserId, token });
      setRatings(ratings => ratings.filter(r => r.id !== id));
      setRibbonType('success');
      setRibbonMessage('Rating deleted.');
      setTimeout(() => setRibbonMessage(''), 2500);
    } catch {
      setRibbonType('error');
      setRibbonMessage('Failed to delete rating.');
      setTimeout(() => setRibbonMessage(''), 2500);
    }
  };

  // Project id to name map
  const projectMap = React.useMemo(() => {
    const map = {};
    projects.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  // Backend base URL for images
  const BACKEND_BASE = API_BASE_URL.replace(/\/api$/, '');

  // Merge posts and ratings into a single feed, sorted by created_at
  const mergedFeed = [
    ...filteredPosts.map(p => ({ ...p, _type: 'post' })),
    ...ratings.map(r => ({ ...r, _type: 'rating' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto 32px auto',
        background: 'var(--primary-bg)',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 8px var(--primary-shadow)',
      }}
    >
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 16, color: 'var(--primary-color)' }}>User Feeds</h2>
      <button
        onClick={() => setShowRatingModal(true)}
        style={{
          marginBottom: 18,
          padding: '10px 24px',
          borderRadius: 8,
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          fontWeight: 600,
          fontFamily: "'FK Grotesk', Arial, sans-serif",
          fontSize: 16,
          cursor: 'pointer',
          boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
        }}
      >
        Give Appreciation / Rating
      </button>
      {/* Rating Modal */}
      {showRatingModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <form
            onSubmit={handleSubmitRating}
            style={{
              background: 'var(--primary-bg)', borderRadius: 14, padding: 28, minWidth: 320, maxWidth: 420, boxShadow: '0 4px 24px var(--primary-shadow)', fontFamily: "'FK Grotesk', Arial, sans-serif", color: 'var(--primary-color)', maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Give Appreciation / Rating</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Project <span style={{ color: '#b00020' }}>*</span></label>
              <select
                value={ratingProject}
                onChange={e => { setRatingProject(e.target.value); setRatingRatee(''); }}
                required
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--primary-shadow)', fontFamily: 'inherit', fontSize: 15, background: 'var(--primary-bg)', color: 'var(--primary-color)' }}
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Person to Appreciate / Rate <span style={{ color: '#b00020' }}>*</span></label>
              <input
                type="text"
                placeholder="Search user..."
                value={ratingSearch}
                onChange={e => setRatingSearch(e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--primary-shadow)', fontFamily: 'inherit', fontSize: 15, background: 'var(--primary-bg)', color: 'var(--primary-color)', marginBottom: 6 }}
              />
              <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--primary-shadow)', borderRadius: 6, background: 'var(--primary-bg)' }}>
                {filteredRatingMembers.filter(m => m.name.toLowerCase().includes(ratingSearch.toLowerCase())).map(m => (
                  <div
                    key={m.user_id}
                    onClick={() => setRatingRatee(m.user_id)}
                    style={{ padding: 8, cursor: 'pointer', background: ratingRatee === m.user_id ? 'var(--primary-highlight)' : 'transparent', color: ratingRatee === m.user_id ? 'var(--primary-color)' : undefined }}
                  >
                    {m.name} ({m.email})
                  </div>
                ))}
                {filteredRatingMembers.length === 0 && <div style={{ padding: 8, color: '#888' }}>No users</div>}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Rating Value</label>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.25}
                value={ratingValue}
                onChange={e => setRatingValue(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 18, marginTop: 4 }}>{ratingValue}</div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Comment (optional)</label>
              <textarea
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--primary-shadow)', fontFamily: 'inherit', fontSize: 15, background: 'var(--primary-bg)', color: 'var(--primary-color)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowRatingModal(false)} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--primary-highlight)', color: 'var(--primary-color)', border: 'none', fontWeight: 600, fontFamily: 'inherit', fontSize: 15, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={ratingLoading || !ratingProject || !ratingRatee} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600, fontFamily: 'inherit', fontSize: 15, cursor: ratingLoading ? 'not-allowed' : 'pointer' }}>{ratingLoading ? 'Submitting...' : 'Submit'}</button>
            </div>
          </form>
        </div>
      )}
      {/* Main Feed Table (merged posts and ratings) follows immediately after the button. */}
      {loading ? (
        <div style={{ color: 'var(--primary-color, #888)' }}>Loading posts...</div>
      ) : error ? (
        <div style={{ color: '#b00020' }}>{error}</div>
      ) : total === 0 ? (
        <div>No posts found.</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginTop: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)' }}>
              <thead>
                <tr style={{ background: 'var(--primary-highlight)' }}>
                  <th style={th}>Type</th>
                  <th style={th}>Project</th>
                  <th style={th}>Author</th>
                  <th style={th}>Content / Rating</th>
                  <th style={th}>Images</th>
                  <th style={th}>Tags / To</th>
                  <th style={th}>Created</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {mergedFeed.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>No posts or appreciations/ratings found.</td></tr>
                ) : (
                  mergedFeed.slice((page - 1) * limit, page * limit).map(item => (
                    item._type === 'post' ? (
                      <tr key={`post-${item.id}`} style={{ background: 'var(--primary-bg)', borderBottom: '1px solid var(--primary-shadow)', color: 'var(--primary-color)' }}>
                        <td style={td}>Post</td>
                        <td style={td}>{projectMap[item.project_id] || item.project_id}</td>
                        <td style={td}><MdPerson style={{ verticalAlign: 'middle', marginRight: 4 }} />{item.author_email}</td>
                        <td style={{ ...td, maxWidth: 220, wordBreak: 'break-word' }}>{item.content}</td>
                        <td style={td}>
                          {item.images && item.images.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {item.images.map((img, i) => (
                                <button
                                  key={i}
                                  onClick={() => setImageModal({ open: true, src: img.startsWith('http') ? img : BACKEND_BASE + img })}
                                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                  title="View Image"
                                >
                                  <MdImage style={{ fontSize: 20, color: '#a3b1c6' }} />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#bbb' }}>-</span>
                          )}
                        </td>
                        <td style={td}>
                          {item.tags && item.tags.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {item.tags.map((tag) => (
                                <span key={tag.id} style={{ background: '#f0f4fa', color: '#6a7ba2', borderRadius: 8, padding: '2px 8px', fontSize: 13, marginRight: 2, display: 'inline-flex', alignItems: 'center', marginBottom: 2 }}>
                                  <MdLabel style={{ fontSize: 14, marginRight: 2 }} />{tag.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#bbb' }}>-</span>
                          )}
                        </td>
                        <td style={td}>{new Date(item.created_at).toLocaleString()}</td>
                        <td style={{ ...td, display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setEditModal({ open: true, post: item })}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: 'var(--accent)',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
                            }}
                            title="Edit Post"
                          >
                            <MdEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deleting === item.id}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: 'var(--primary-highlight)',
                              color: '#b00020',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
                            }}
                            title="Delete Post"
                          >
                            <MdDelete />
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={`rating-${item.id}`} style={{ background: '#e8f5e9', borderBottom: '1px solid var(--primary-shadow)', color: 'var(--primary-color)' }}>
                        <td style={td}><span style={{ fontWeight: 700, color: item.value > 0 ? '#388e3c' : item.value < 0 ? '#b00020' : '#888' }}>Appreciation</span></td>
                        <td style={td}>{projectMap[item.project_id] || item.project_id}</td>
                        <td style={td}><MdPerson style={{ verticalAlign: 'middle', marginRight: 4 }} />{item.rater_id === currentUserId ? 'You' : item.rater_id}</td>
                        <td style={{ ...td, maxWidth: 220, wordBreak: 'break-word' }}>
                          <span style={{ fontWeight: 700, color: item.value > 0 ? '#388e3c' : item.value < 0 ? '#b00020' : '#888', fontSize: 18 }}>{item.value > 0 ? '+' : ''}{item.value}</span>
                          <span style={{ marginLeft: 8 }}>{item.comment}</span>
                        </td>
                        <td style={td}>-</td>
                        <td style={td}><span style={{ color: '#1976d2', fontWeight: 600 }}>To: {item.ratee_id}</span></td>
                        <td style={td}>{new Date(item.created_at).toLocaleString()}</td>
                        <td style={{ ...td, display: 'flex', gap: 8 }}>
                          {item.rater_id === currentUserId && (
                            <>
                              <button onClick={() => openEditRating(item)} style={{ background: 'var(--primary-highlight)', color: 'var(--primary-color)', border: 'none', borderRadius: 6, padding: '2px 10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Edit</button>
                              <button onClick={() => handleDeleteRating(item.id)} style={{ background: '#fff', color: '#b00020', border: '1px solid #b00020', borderRadius: 6, padding: '2px 10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label htmlFor="perPage" style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", color: 'var(--primary-color)', fontSize: 14 }}>Per Page:</label>
              <select
                id="perPage"
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                style={{ padding: 6, borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", border: '1px solid var(--primary-shadow)', background: 'var(--primary-bg)', color: 'var(--primary-color)' }}
              >
                {[10, 20, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: 5,
                  fontFamily: "'FK Grotesk', Arial, sans-serif",
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
                }}
              >
                Prev
              </button>
              <span style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", color: 'var(--primary-color)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: 5,
                  fontFamily: "'FK Grotesk', Arial, sans-serif",
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {ribbonMessage && (
        <div style={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          background: ribbonType === 'success' ? '#43a047' : '#b00020',
          color: '#fff',
          padding: '12px 32px',
          borderRadius: 10,
          fontWeight: 600,
          fontFamily: "'FK Grotesk', Arial, sans-serif",
          fontSize: 16,
          zIndex: 2001,
          boxShadow: '0 4px 18px #0003',
          letterSpacing: 1,
          minWidth: 220,
          textAlign: 'center',
          pointerEvents: 'none',
          transition: 'opacity 0.3s',
        }}>
          {ribbonMessage}
        </div>
      )}
      {imageModal.open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setImageModal({ open: false, src: null }); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: 'transparent' }}>
            <button
              onClick={() => setImageModal({ open: false, src: null })}
              style={{
                position: 'absolute',
                top: -18,
                right: -18,
                background: '#fff',
                color: '#b00020',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                fontSize: 22,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px #0003',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close"
            >
              ×
            </button>
            <img
              src={imageModal.src}
              alt="post-img"
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                borderRadius: 10,
                boxShadow: '0 2px 8px #0008',
                background: '#fff',
                display: 'block',
                margin: '0 auto',
              }}
            />
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editModal.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.18)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'var(--primary-bg)',
              borderRadius: 14,
              padding: 28,
              minWidth: 320,
              maxWidth: 420,
              boxShadow: '0 4px 24px var(--primary-shadow)',
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              color: 'var(--primary-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Edit Post</h3>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Tags:</div>
              {editModal.post.tags && editModal.post.tags.length > 0 ? (
                editModal.post.tags.map(tag => (
                  <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: '#f0f4fa', color: '#6a7ba2', borderRadius: 8, padding: '2px 8px', fontSize: 13, display: 'inline-flex', alignItems: 'center' }}>
                      <MdLabel style={{ fontSize: 14, marginRight: 2 }} />{tag.name}
                    </span>
                    <button
                      onClick={() => handleDeleteTag(editModal.post.id, tag.id)}
                      disabled={editLoading}
                      style={{ background: 'none', color: '#b00020', border: 'none', cursor: 'pointer', fontSize: 18 }}
                      title="Remove Tag"
                    >
                      <MdDelete />
                    </button>
                  </div>
                ))
              ) : <span style={{ color: '#bbb' }}>No tags</span>}
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Images:</div>
              {editModal.post.images && editModal.post.images.length > 0 ? (
                editModal.post.images.map(img => (
                  <div key={img} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <a href={img} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', color: '#1976d2' }}>
                      <MdImage style={{ fontSize: 20, marginRight: 4 }} />View
                    </a>
                    <button
                      onClick={() => handleDeleteImage(editModal.post.id, img)}
                      disabled={editLoading}
                      style={{ background: 'none', color: '#b00020', border: 'none', cursor: 'pointer', fontSize: 18 }}
                      title="Remove Image"
                    >
                      <MdDelete />
                    </button>
                  </div>
                ))
              ) : <span style={{ color: '#bbb' }}>No images</span>}
            </div>
            <button
              onClick={() => setEditModal({ open: false, post: null })}
              style={{ marginTop: 10, padding: '8px 18px', borderRadius: 8, background: 'var(--primary-highlight)', color: 'var(--primary-color)', border: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const th = { padding: '10px 8px', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid #e0e0e0', fontSize: 15 };
const td = { padding: '8px 6px', verticalAlign: 'top', fontSize: 15 };

export default UserFeeds;