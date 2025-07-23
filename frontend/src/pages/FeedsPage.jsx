import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import { FaUserCircle, FaHeart, FaRegHeart, FaImage, FaTimes } from 'react-icons/fa';
import '../tiptap-editor-fix.css';

const FK_FONT = { fontFamily: "'FK Grotesk', 'Poppins', sans-serif" };

// --- PostComposer ---
function PostComposer({ onPost, user, projectId }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editorFocused, setEditorFocused] = useState(false);

  // Mention suggestion fetch
  const fetchSuggestions = async (query) => {
    setMentionLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users?search=${encodeURIComponent(query)}`);
      setSuggestions((res.data.users || []).map(u => ({
        id: u.email,
        label: u.name + ' (@' + u.email + ')',
        name: u.name,
        email: u.email
      })));
    } catch {
      setSuggestions([]);
    } finally {
      setMentionLoading(false);
    }
  };

  // Tiptap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Mention.configure({
        HTMLAttributes: {
          class: 'tag-blot',
          style: "background:#e3eafc;color:#1976d2;border-radius:6px;padding:2px 6px;margin:0 2px;font-weight:600;font-family:'FK Grotesk','Poppins',sans-serif;"
        },
        suggestion: {
          char: '@',
          items: async ({ query }) => {
            if (!query) return [];
            await fetchSuggestions(query);
            return suggestions;
          },
          render: () => {
            let component;
            let popup;
            return {
              onStart: props => {
                component = document.createElement('div');
                component.className = 'mention-dropdown';
                component.style.background = '#fff';
                component.style.border = '1.5px solid #a3b1c6';
                component.style.borderRadius = '8px';
                component.style.boxShadow = '0 2px 8px #a3b1c622';
                component.style.fontFamily = "'FK Grotesk', 'Poppins', sans-serif";
                component.style.minWidth = '220px';
                component.style.maxHeight = '220px';
                component.style.overflowY = 'auto';
                popup = props.popup;
                update(props);
              },
              onUpdate: update,
              onKeyDown: props => {
                if (props.event.key === 'Escape') {
                  popup && popup.hide();
                  return true;
                }
                return false;
              },
              onExit: () => {
                if (component && component.parentNode) {
                  component.parentNode.removeChild(component);
                }
              }
            };
            function update(props) {
              if (!component) return;
              component.innerHTML = '';
              (props.items || []).forEach((item, i) => {
                const div = document.createElement('div');
                div.textContent = item.label;
                div.style.padding = '8px 14px';
                div.style.background = i === props.selected ? '#e3eafc' : '#fff';
                div.style.color = '#232a36';
                div.style.cursor = 'pointer';
                div.style.fontWeight = '500';
                div.style.borderBottom = i !== props.items.length - 1 ? '1px solid #f0f0f0' : 'none';
                div.style.borderRadius = i === props.selected ? '8px' : '0';
                div.onmouseenter = () => props.command({ id: item.id, label: item.label, name: item.name, email: item.email });
                div.onclick = () => props.command({ id: item.id, label: item.label, name: item.name, email: item.email });
                component.appendChild(div);
              });
              if (popup) popup.update(component);
            }
          }
        }
      })
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setEditorContent(editor.getHTML());
    },
    onFocus: () => setEditorFocused(true),
    onBlur: () => setEditorFocused(false),
    editorProps: {
      attributes: {
        style: "min-height:100px;" + FK_FONT.fontFamily
      }
    }
  });

  // Handle image selection
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle post submit
  const handleSubmit = async () => {
    setUploading(true);
    setError('');
    setUploadProgress(0);
    try {
      let imagePaths = [];
      if (image) {
        // Upload image first
        const formData = new FormData();
        formData.append('image', image);
        const uploadRes = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          },
        });
        if (uploadRes.data && uploadRes.data.filePath) {
          imagePaths = [uploadRes.data.filePath];
        } else {
          setError('Image upload failed.');
          setUploading(false);
          setUploadProgress(0);
          return;
        }
      }
      // Call parent handler with image paths
      await onPost({
        content: editor.getHTML(),
        images: imagePaths,
        author_email: user?.email,
        project_id: projectId,
        type: 'post',
      });
      editor.commands.clearContent();
      setImage(null);
      setImagePreview(null);
      setUploadProgress(0);
    } catch (err) {
      setError('Failed to post. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Theme detection
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.body.classList.contains('theme-dark') || localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });
  useEffect(() => {
    const updateTheme = () => {
      setTheme(document.body.classList.contains('theme-dark') || localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener('storage', updateTheme);
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('storage', updateTheme);
      observer.disconnect();
    };
  }, []);

  return (
    <div style={{ ...FK_FONT, background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #a3b1c622', padding: '16px 0', marginBottom: 18, width: '100%', maxWidth: 600, position: 'relative', marginLeft: 'auto', marginRight: 'auto', background: theme === 'dark' ? 'var(--primary-bg, #23272f)' : '#fff', border: theme === 'dark' ? '1.5px solid #313543' : '1.5px solid #a3b1c6' }}>
      <div style={{ padding: '0 16px' }}>
        <div style={{ marginBottom: 8, fontWeight: 600, color: theme === 'dark' ? '#f1f1f1' : '#232a36' }}>Create a post</div>
        <div
          className={`tiptap-editor-root${theme === 'dark' ? ' tiptap-dark' : ''}`}
          style={{
            position: 'relative',
            borderRadius: 10,
            border: theme === 'dark' ? '1.5px solid #313543' : '1.5px solid #a3b1c6',
            background: theme === 'dark' ? 'var(--primary-bg, #23272f)' : '#fff',
            color: theme === 'dark' ? '#f1f1f1' : '#232a36',
            minHeight: 44, // about 2 lines
            maxHeight: 220,
            marginBottom: 8,
            ...FK_FONT,
            width: '100%',
            boxShadow: '0 2px 8px #a3b1c622',
            boxSizing: 'border-box',
            padding: 0,
            outline: 'none',
            overflowY: 'auto',
            fontSize: 16,
            lineHeight: 1.4,
            resize: 'vertical',
            caretColor: theme === 'dark' ? '#fff' : '#232a36',
            display: 'flex',
            alignItems: 'stretch',
          }}
        >
          {isEditorEmpty(editorContent) && !image && !editorFocused && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '12px',
              color: '#b0b0b0',
              pointerEvents: 'none',
              fontSize: 16,
              fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
              zIndex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              Write something or upload an image to post...
            </div>
          )}
          <div style={{ width: '100%', minHeight: 44, padding: 12, boxSizing: 'border-box' }}>
            <EditorContent editor={editor} style={{ width: '100%', minHeight: 20, background: 'transparent', border: 'none', outline: 'none', margin: 0, padding: 0, boxShadow: 'none' }} />
          </div>
        </div>
        {imagePreview && (
          <div style={{ marginBottom: 8, width: '100%', textAlign: 'center', position: 'relative' }}>
            <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, marginBottom: 4 }} />
            <button
              onClick={handleRemoveImage}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'transparent',
                border: 'none',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: theme === 'dark' ? '#fff' : '#232a36',
                fontSize: 18,
                fontWeight: 400,
                zIndex: 2,
                transition: 'background 0.15s',
              }}
              aria-label="Remove image"
              onMouseOver={e => e.currentTarget.style.background = theme === 'dark' ? '#313543' : '#e3eafc'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontFamily: "'FK Grotesk', 'Poppins', sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1, display: 'block' }}>&#10005;</span>
            </button>
          </div>
        )}
        {error && <div style={{ color: '#b00020', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => fileInputRef.current.click()}
            style={{ ...FK_FONT, padding: 0, borderRadius: 6, border: 'none', background: 'none', color: theme === 'dark' ? '#f1f1f1' : '#232a36', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}
            disabled={!!image}
            aria-label="Add image"
          >
            <FaImage />
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageChange}
            disabled={!!image}
          />
          <button
            onClick={handleSubmit}
            disabled={uploading || (isEditorEmpty(editorContent) && !image)}
            style={{
              ...FK_FONT,
              padding: '6px 18px',
              borderRadius: 6,
              background: uploading || (isEditorEmpty(editorContent) && !image)
                ? '#a3b1c6'
                : '#1976d2',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: uploading || (isEditorEmpty(editorContent) && !image) ? 'not-allowed' : 'pointer',
              boxShadow: uploading || (isEditorEmpty(editorContent) && !image) ? 'none' : '0 2px 8px #1976d244',
              transition: 'background 0.18s',
            }}
          >
            {uploading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
      {/* Upload progress ribbon */}
      {uploading && uploadProgress > 0 && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, background: '#232a36', color: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #a3b1c622', padding: '12px 24px', zIndex: 9999, fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaImage style={{ fontSize: 20 }} />
          Uploading image... {uploadProgress}%
        </div>
      )}
    </div>
  );
}

function isEditorEmpty(html) {
  const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
  return text.length === 0;
}

function timeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

// --- FeedItem ---
function FeedItem({ post, theme }) {
  // Highlight tags in the feed display
  function highlightTags(html, tags) {
    if (!tags || tags.length === 0) return html;
    let out = html;
    tags.forEach(tag => {
      // Replace @tag with styled span (avoid double-highlighting)
      const regex = new RegExp(`@${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\w@])`, 'g');
      out = out.replace(
        regex,
        `<span class="tag-blot" style="background:#e3eafc;color:#1976d2;border-radius:6px;padding:2px 6px;margin:0 2px;font-weight:600;font-family:'FK Grotesk','Poppins',sans-serif;">@${tag}</span>`
      );
    });
    return out;
  }
  const hasImage = post.images && post.images.length > 0;
  // Helper to get backend base URL (strip /api if present)
  const BACKEND_BASE = API_BASE_URL.replace(/\/api$/, '');
  const [authorName, setAuthorName] = React.useState(post.author_name || '');
  React.useEffect(() => {
    if (!authorName && post.author_email) {
      axios.get(`${API_BASE_URL}/users?search=${encodeURIComponent(post.author_email)}`)
        .then(res => {
          const user = res.data.users && res.data.users.find(u => u.email === post.author_email);
          if (user && user.name) setAuthorName(user.name);
        });
    }
  }, [post.author_email, authorName]);
  const { user } = useAuth();
  const [likeCount, setLikeCount] = React.useState(0);
  const [liked, setLiked] = React.useState(false);
  // Fetch like count and status
  React.useEffect(() => {
    if (!post.id || !user?.email) return;
    axios.get(`${API_BASE_URL.replace(/\/api$/, '')}/api/posts/${post.id}/likes`, { params: { user_email: user.email } })
      .then(res => {
        setLikeCount(res.data.count);
        setLiked(res.data.liked);
      });
  }, [post.id, user?.email]);
  // Like/unlike handler
  const handleLike = async () => {
    if (!user?.email) return;
    if (liked) {
      await axios.delete(`${API_BASE_URL.replace(/\/api$/, '')}/api/posts/${post.id}/like`, { data: { user_email: user.email } });
      setLikeCount(c => c - 1);
      setLiked(false);
    } else {
      await axios.post(`${API_BASE_URL.replace(/\/api$/, '')}/api/posts/${post.id}/like`, { user_email: user.email });
      setLikeCount(c => c + 1);
      setLiked(true);
    }
  };
  return (
    <div style={{
      ...FK_FONT,
      background: theme === 'dark' ? 'var(--primary-bg, #23272f)' : '#fff',
      borderRadius: 10,
      boxShadow: '0 2px 8px #a3b1c622',
      marginBottom: 18,
      width: '100%',
      maxWidth: 600,
      position: 'relative',
      marginLeft: 'auto',
      marginRight: 'auto',
      border: theme === 'dark' ? '1.5px solid #313543' : '1.5px solid #a3b1c6',
      overflow: 'hidden',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      color: theme === 'dark' ? '#f1f1f1' : '#232a36',
    }}>
      {hasImage && (
        <div style={{ width: '100%', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
          {post.images.map((img, i) => (
            <img
              key={i}
              src={img.startsWith('http') ? img : BACKEND_BASE + img}
              alt="post-img"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                borderRadius: 10,
                background: 'transparent',
                boxShadow: '0 1px 4px #a3b1c622',
                margin: 0,
              }}
            />
          ))}
        </div>
      )}
      {/* Post content */}
      <div style={{ padding: 16, paddingTop: hasImage ? 0 : 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, marginBottom: 12 }}
          dangerouslySetInnerHTML={{ __html: highlightTags(post.content, post.tags) }}
        />
        {/* Author info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: theme === 'dark' ? '#23272f' : '#e3eafc', color: '#a3b1c6', fontSize: 28 }}>
            <FaUserCircle />
          </span>
          <span style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#f1f1f1' : '#232a36', fontFamily: "'FK Grotesk', 'Poppins', sans-serif" }}>{authorName || post.author_email}</span>
        </div>
        {/* Like button and count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 2px 0' }}>
          <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: liked ? '#e74c3c' : '#a3b1c6', fontSize: 20, display: 'flex', alignItems: 'center' }} aria-label={liked ? 'Unlike' : 'Like'}>
            {liked ? <FaHeart /> : <FaRegHeart />}
          </button>
          <span style={{ fontSize: 15, color: theme === 'dark' ? '#f1f1f1' : '#232a36', fontWeight: 500 }}>{likeCount}</span>
        </div>
        {/* Relative time */}
        <div style={{ fontSize: 13, color: '#b0b0b0', marginTop: 2 }}>{timeAgo(post.created_at)}</div>
      </div>
    </div>
  );
}

// --- FeedList ---
function FeedList({ posts, theme }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {posts.map(post => <FeedItem key={post.id} post={post} theme={theme} />)}
    </div>
  );
}

// --- Main FeedsPage ---
export default function FeedsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const projectId = localStorage.getItem('selectedProjectId');

  // Fetch posts from backend
  useEffect(() => {
    if (!projectId) {
      setError('No project selected.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    axios.get(`${API_BASE_URL}/posts?projectId=${projectId}`)
      .then(res => setPosts(res.data.posts || []))
      .catch(() => setError('Failed to load posts.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Handle new post
  const handlePost = async (post) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/posts`, post);
      // Refetch posts
      const res = await axios.get(`${API_BASE_URL}/posts?projectId=${projectId}`);
      setPosts(res.data.posts || []);
    } catch {
      setError('Failed to post.');
    } finally {
      setLoading(false);
    }
  };

  // Theme detection
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.body.classList.contains('theme-dark') || localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });
  useEffect(() => {
    const updateTheme = () => {
      setTheme(document.body.classList.contains('theme-dark') || localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener('storage', updateTheme);
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('storage', updateTheme);
      observer.disconnect();
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-bg, #f5f8ff)', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
        <PostComposer onPost={handlePost} user={user} projectId={projectId} />
        {loading ? (
          <div style={{ ...FK_FONT, color: '#6a7ba2', textAlign: 'center', marginTop: 32 }}>Loading...</div>
        ) : error ? (
          <div style={{ ...FK_FONT, color: '#b00020', textAlign: 'center', marginTop: 32 }}>{error}</div>
        ) : (
          <FeedList posts={posts} theme={theme} />
        )}
      </div>
    </div>
  );
} 