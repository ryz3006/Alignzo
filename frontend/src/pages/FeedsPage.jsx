import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import { FaUserCircle, FaHeart, FaRegHeart, FaImage, FaTimes, FaRegSmile, FaListUl, FaListOl, FaRegEdit, FaRegStar, FaUserPlus, FaStar } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import '../tiptap-editor-fix.css';
import { fetchRatings, createRating } from '../api/ratings';
import { fetchEscalationMatrix, listUsers, fetchProjectMembers, searchUsers } from '../api/users';

// 1. Import emoji-mart picker (or fallback to a simple emoji list if not installed)
let Picker, emojiMartLoaded = false;
try {
  Picker = require('emoji-mart').Picker;
  emojiMartLoaded = true;
} catch (e) {
  // fallback will be used
}

const FK_FONT = { fontFamily: "'FK Grotesk', 'Poppins', sans-serif" };

// Define toolbarBtnStyle above the component
const toolbarBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18,
  color: '#b0b0b0',
  zIndex: 4,
  padding: 0,
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '32px',
  width: '32px',
  margin: '0 2px',
  boxShadow: 'none',
  borderRadius: 4,
  transition: 'color 0.15s, background 0.15s',
};

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
  // Add state for character count and tooltip
  const [charCount, setCharCount] = useState(0);
  const [showCharTooltip, setShowCharTooltip] = useState(false);
  // Add a state to track if the user attempted to exceed the limit
  const [charLimitExceeded, setCharLimitExceeded] = useState(false);
  // 2. Add state for emoji picker visibility
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef();
  const emojiPickerRef = useRef();

  // --- User search for tagging ---
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchDropdown, setUserSearchDropdown] = useState(false);
  const userSearchRef = useRef();
  const userSearchDropdownRef = useRef();

  // Add state for tagged users
  const [taggedUsers, setTaggedUsers] = useState([]); // Array of {id, name, email}

  // Add this effect to fetch users as user types
  useEffect(() => {
    if (!userSearch || !projectId) {
      setUserSearchResults([]);
      return;
    }
    let cancelled = false;
    setUserSearchLoading(true);
    axios.get(`${API_BASE_URL}/users?search=${encodeURIComponent(userSearch)}${projectId ? `&projectId=${projectId}` : ''}`)
      .then(res => {
        if (!cancelled) setUserSearchResults((res.data.users || []).map(u => ({
          id: u.id, // use integer user ID
          label: u.name + ' (@' + u.email + ')',
          name: u.name,
          email: u.email
        })));
      })
      .catch(() => { if (!cancelled) setUserSearchResults([]); })
      .finally(() => { if (!cancelled) setUserSearchLoading(false); });
    return () => { cancelled = true; };
  }, [userSearch, projectId]);

  // Mention suggestion fetch
  const fetchSuggestions = async (query) => {
    setMentionLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users?search=${encodeURIComponent(query)}`);
      setSuggestions((res.data.users || []).map(u => ({
        id: u.id, // use integer user ID
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
          style: "background:#e3eafc;color:#1976d2;border-radius:6px;padding:2px 6px;margin:0 2px;font-weight:600;font-family:'FK Grotesk','Poppins',sans-serif;",
          title: '',
        },
        renderLabel({ node }) {
          // Only use name for display, email for tooltip
          const name = node.attrs.name || node.attrs.id || 'User';
          const email = node.attrs.email || node.attrs.id || '';
          return `<span class='tag-blot' style="background:#e3eafc;color:#1976d2;border-radius:6px;padding:2px 6px;margin:0 2px;font-weight:600;font-family:'FK Grotesk','Poppins',sans-serif;" title="${email}">${name}</span>`;
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
                div.textContent = item.name + ' (@' + item.email + ')';
                div.style.padding = '8px 14px';
                div.style.background = i === props.selected ? '#e3eafc' : '#fff';
                div.style.color = '#232a36';
                div.style.cursor = 'pointer';
                div.style.fontWeight = '500';
                div.style.borderBottom = i !== props.items.length - 1 ? '1px solid #f0f0f0' : 'none';
                div.style.borderRadius = i === props.selected ? '8px' : '0';
                div.onmouseenter = () => props.command({ id: item.id, name: item.name, email: item.email });
                div.onclick = () => props.command({ id: item.id, name: item.name, email: item.email });
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

  // Update charCount on editor content change
  useEffect(() => {
    const text = editor?.getText() || '';
    setCharCount(text.length);
    setShowCharTooltip(text.length >= 500);
  }, [editorContent, editor]);

  // Prevent typing/pasting beyond 500 chars
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;
    const handleBeforeInput = (event) => {
      const text = editor.getText() || '';
      if (text.length >= 500 && event.inputType !== 'deleteContentBackward') {
        event.preventDefault();
        setCharLimitExceeded(true);
        setTimeout(() => setCharLimitExceeded(false), 2000);
      }
    };
    const handlePaste = (event) => {
      const text = editor.getText() || '';
      const paste = (event.clipboardData || window.clipboardData).getData('text');
      if (text.length + paste.length > 500) {
        event.preventDefault();
        setCharLimitExceeded(true);
        setTimeout(() => setCharLimitExceeded(false), 2000);
        const allowed = 500 - text.length;
        if (allowed > 0) {
          editor.commands.insertContent(paste.slice(0, allowed));
        }
      }
    };
    const el = editor.view.dom;
    el.addEventListener('beforeinput', handleBeforeInput);
    el.addEventListener('paste', handlePaste);
    return () => {
      el.removeEventListener('beforeinput', handleBeforeInput);
      el.removeEventListener('paste', handlePaste);
    };
  }, [editor?.view?.dom]);

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

  // 3. Function to insert emoji at cursor
  const insertEmoji = (emoji) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji.native || emoji).run();
    }
    setShowEmojiPicker(false);
  };

  // Insert @mention at cursor and add to taggedUsers
  const insertMention = (userObj) => {
    const name = userObj.name || userObj.id || 'User';
    const email = userObj.email || userObj.id || '';
    // Only add if not already tagged
    setTaggedUsers(prev => prev.some(u => u.id === userObj.id) ? prev : [...prev, { id: userObj.id, name, email }]);
    if (editor) {
      editor.chain().focus().insertContent(name + ' ').run(); // Just insert name, not HTML
    }
    setUserSearch("");
    setUserSearchResults([]);
    setUserSearchDropdown(false);
  };

  // Remove tagged user
  const removeTaggedUser = (id) => {
    setTaggedUsers(prev => prev.filter(u => u.id !== id));
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
      // Call parent handler with image paths and tagged user IDs
      await onPost({
        content: editor.getHTML(),
        images: imagePaths,
        author_email: user?.email,
        project_id: projectId,
        type: 'post',
        tags: taggedUsers.map(u => u.id), // Send user IDs only
      });
      editor.commands.clearContent();
      setImage(null);
      setImagePreview(null);
      setUploadProgress(0);
      setTaggedUsers([]);
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

  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!userSearchDropdown) return;
    function handleClickOutside(event) {
      if (
        userSearchDropdownRef.current &&
        !userSearchDropdownRef.current.contains(event.target) &&
        userSearchRef.current &&
        !userSearchRef.current.contains(event.target)
      ) {
        setUserSearchDropdown(false);
      }
    }
    if (userSearchDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userSearchDropdown]);

  // Move user search dropdown outside tile
  // We'll use a portal for the dropdown
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if (userSearchDropdown && userSearchRef.current) {
      const rect = userSearchRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [userSearchDropdown, userSearchRef.current, userSearchResults]);

  // Dropdown element for portal
  const userDropdown = userSearchDropdown && userSearch && (
    <div
      ref={userSearchDropdownRef}
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        background: theme === 'dark' ? '#23272f' : '#fff',
        border: theme === 'dark' ? '1.5px solid #313543' : '1.5px solid #a3b1c6',
        borderRadius: 8,
        boxShadow: '0 2px 8px #a3b1c622',
        zIndex: 1000,
        maxHeight: 220,
        overflowY: 'auto',
        fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
      }}
    >
      {userSearchLoading ? (
        <div style={{ padding: 12, color: '#888', textAlign: 'center' }}>Searching...</div>
      ) : userSearchResults.length === 0 ? (
        <div style={{ padding: 12, color: '#888', textAlign: 'center' }}>No users found</div>
      ) : (
        userSearchResults.map((item, i) => (
          <div
            key={item.id}
            onClick={() => insertMention(item)}
            style={{
              padding: '8px 14px',
              background: i === 0 ? (theme === 'dark' ? '#313543' : '#e3eafc') : 'transparent',
              color: theme === 'dark' ? '#f1f1f1' : '#232a36',
              cursor: 'pointer',
              fontWeight: 500,
              borderBottom: i !== userSearchResults.length - 1 ? '1px solid #f0f0f0' : 'none',
              borderRadius: 8,
              fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = theme === 'dark' ? '#313543' : '#e3eafc'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            {item.label}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div style={{
      ...FK_FONT,
      borderRadius: 10,
      boxShadow: '0 2px 8px #a3b1c622',
      padding: '8px 0',
      marginBottom: 12,
      width: '100%',
      maxWidth: 600,
      position: 'relative',
      marginLeft: 'auto',
      marginRight: 'auto',

    }}>
      <div style={{ padding: '0 12px' }}>
        
        <div
          className={`tiptap-editor-root${theme === 'dark' ? ' tiptap-dark' : ''}`}
          style={{
            position: 'relative',
            borderRadius: 10,
            border: theme === 'dark' ? '1.5px solid #313543' : '1.5px solid #a3b1c6',
            background: theme === 'dark' ? 'var(--primary-bg, #23272f)' : '#fff',
            color: theme === 'dark' ? '#f1f1f1' : '#232a36',
            minHeight: 24,
            marginBottom: 6,
            ...FK_FONT,
            width: '100%',
            boxShadow: '0 2px 8px #a3b1c622',
            boxSizing: 'border-box',
            padding: 0,
            outline: 'none',
            fontSize: 16,
            lineHeight: 1.4,
            resize: 'none',
            caretColor: theme === 'dark' ? '#fff' : '#232a36',
            display: 'flex',
            alignItems: 'stretch',
            overflow: 'visible',
            transition: 'min-height 0.2s',
          }}
        >
          {isEditorEmpty(editorContent) && !image && !editorFocused && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '8px',
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
          {/* Add a toolbar at the bottom of the text box and place the emoji icon inside it */}
          {/* Adjust the toolbar so its width and border radius match the text box border exactly */}
          <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box', transition: 'min-height 0.2s', display: 'flex', flexDirection: 'column', borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden', border: theme === 'dark' ? '1.5px solid #313543' : '1.5px solid #a3b1c6', background: theme === 'dark' ? 'var(--primary-bg, #23272f)' : '#fff' }}>
            <div style={{ flex: 1, minHeight: 48, width: '100%', boxSizing: 'border-box', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {editor && (
                <EditorContent editor={editor} style={{ width: '100%', minHeight: 24, background: 'transparent', border: 'none', outline: 'none', margin: 0, padding: 0, boxShadow: 'none', flex: 1 }} />
              )}
            </div>
            {/* Character count - always above the toolbar, never overlaps */}
            <div style={{
              width: '100%',
              textAlign: 'right',
              fontSize: 13,
              color: charCount >= 500 ? '#e53935' : charCount >= 400 ? '#fbc02d' : '#888',
              fontWeight: 500,
              background: theme === 'dark' ? 'rgba(35,39,47,0.95)' : 'rgba(255,255,255,0.7)',
              borderRadius: 6,
              padding: '0 28px 2px 0',
              zIndex: 2,
              userSelect: 'none',
              pointerEvents: 'none',
              marginBottom: 0,
              border: theme === 'dark' ? '1px solid #313543' : 'none',
              boxShadow: theme === 'dark' ? '0 1px 2px #181a20' : 'none',
            }}>
              {charCount}/500
              {charLimitExceeded && (
                <span style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  background: theme === 'dark' ? 'rgba(35,39,47,0.98)' : '#fff',
                  color: '#e53935',
                  border: '1px solid #e53935',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 12,
                  marginTop: 2,
                  zIndex: 10,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px #a3b1c622',
                  pointerEvents: 'auto',
                }}>
                  Character length should be less than 500
                </span>
              )}
            </div>
            {/* Toolbar at the bottom, always below the text box and character count */}
            <div style={{
              width: '100%',
              height: 32,
              background: theme === 'dark' ? 'rgba(40,42,54,0.98)' : 'rgba(245,247,250,0.98)',
              borderTop: theme === 'dark' ? '1.5px solid #313543' : '1.5px solid #a3b1c6',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              zIndex: 3,
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
              boxSizing: 'border-box',
            }}>
              {/* Toolbar buttons here (emoji, formatting, etc.) */}
              {/* Emoji icon in toolbar */}
              <button
                ref={emojiButtonRef}
                type="button"
                aria-label="Insert emoji"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 20,
                  color: '#b0b0b0',
                  zIndex: 4,
                  padding: 0,
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '32px',
                  width: '32px',
                  margin: 0,
                  boxShadow: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.color = theme === 'dark' ? '#f1f1f1' : '#232a36'}
                onMouseOut={e => e.currentTarget.style.color = '#b0b0b0'}
                onFocus={e => e.currentTarget.style.boxShadow = 'none'}
                onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                onClick={() => setShowEmojiPicker((v) => !v)}
              >
                <FaRegSmile />
              </button>
            </div>
          </div>
        </div>
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            style={{
              position: 'absolute',
              zIndex: 100,
              top: 90, // adjust as needed to appear below the toolbar
              left: 16, // align with the emoji button
              background: theme === 'dark' ? 'rgba(40,42,54,0.98)' : '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 8px #a3b1c622',
              minWidth: 280,
              padding: 8,
              fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
            }}
          >
            {emojiMartLoaded ? (
              <Picker
                theme={theme}
                onSelect={insertEmoji}
                style={{ boxShadow: 'none', borderRadius: 12, minWidth: 260, fontFamily: "'FK Grotesk', 'Poppins', sans-serif" }}
                showPreview={false}
                showSkinTones={false}
                perLine={8}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, background: 'none', borderRadius: 12, padding: 4 }}>
                {['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲'].map(e => (
                  <span
                    key={e}
                    style={{ cursor: 'pointer', fontSize: 22, borderRadius: 6, padding: 2, textAlign: 'center', transition: 'background 0.15s', fontFamily: "'FK Grotesk', 'Poppins', sans-serif" }}
                    onClick={() => insertEmoji({ native: e })}
                    onMouseOver={ev => ev.currentTarget.style.background = theme === 'dark' ? '#23272f' : '#f0f0f0'}
                    onMouseOut={ev => ev.currentTarget.style.background = 'transparent'}
                  >{e}</span>
                ))}
              </div>
            )}
          </div>
        )}
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
        {/* Show tagged users below the editor */}
        {taggedUsers.length > 0 && (
          <div style={{ margin: '8px 0', fontSize: 15, color: '#1976d2', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaUserPlus style={{ fontSize: 18, verticalAlign: 'middle' }} />
            {taggedUsers.map(u => (
              <span key={u.id} style={{ background: '#e3eafc', color: '#1976d2', borderRadius: 6, padding: '2px 6px', margin: '0 2px', fontWeight: 600, fontFamily: "'FK Grotesk','Poppins',sans-serif", cursor: 'pointer', position: 'relative' }} title={u.email}>
                {u.name}
                <span onClick={() => removeTaggedUser(u.id)} style={{ marginLeft: 4, color: '#b00020', cursor: 'pointer', fontWeight: 700 }} title="Remove">×</span>
              </span>
            ))}
          </div>
        )}
        {/* User search for tagging - move here, before Post button row */}
        <div style={{ marginBottom: 8, width: '100%', position: 'relative', padding: 0 }}>
          <input
            ref={userSearchRef}
            type="text"
            value={userSearch}
            onChange={e => { setUserSearch(e.target.value); setUserSearchDropdown(true); }}
            onFocus={() => setUserSearchDropdown(true)}
            placeholder="Search users to tag by name or email..."
            style={{
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
              boxSizing: 'border-box',
              padding: '8px 12px',
              borderRadius: 8,
              border: theme === 'dark' ? '1.5px solid #313543' : '1.5px solid #a3b1c6',
              background: theme === 'dark' ? 'var(--primary-bg, #23272f)' : '#f7fafd',
              color: theme === 'dark' ? '#f1f1f1' : '#232a36',
              fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
              fontSize: 15,
              outline: 'none',
              boxShadow: 'none',
              marginBottom: 0,
              transition: 'border 0.15s',
            }}
            autoComplete="off"
          />
        </div>
        {/* Now comes the row with Post button and image upload icon */}
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
      {/* Render user search dropdown using portal for visibility */}
      {userDropdown && createPortal(userDropdown, document.body)}
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
  // --- RATING FEED ITEM BRANCH ---
  if (post._type === 'rating') {
    // State for rater/ratee info
    const [rater, setRater] = React.useState({ name: post.rater_name, email: post.rater_email });
    const [ratee, setRatee] = React.useState({ name: post.ratee_name, email: post.ratee_email });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const value = post.value || 0;
    const absValue = Math.abs(Math.round(value));
    const isPositive = value > 0;
    const isNegative = value < 0;
    // Use imported FaStar directly
    // Helper to fetch user by ID if name/email missing
    React.useEffect(() => {
      async function fetchUser(id, setter) {
        if (!id) return;
        try {
          setLoading(true);
          // Try to get token from localStorage (or skip if not needed)
          const token = localStorage.getItem('firebaseToken');
          const res = await fetch(`${API_BASE_URL.replace(/\/api$/, '')}/api/users?search=${id}`);
          const data = await res.json();
          const user = (data.users || []).find(u => u.id == id);
          if (user) setter({ name: user.name, email: user.email });
        } catch (e) { setError('Failed to fetch user info'); }
        finally { setLoading(false); }
      }
      if (!rater?.name && post.rater_id) fetchUser(post.rater_id, setRater);
      if (!ratee?.name && post.ratee_id) fetchUser(post.ratee_id, setRatee);
    }, [post.rater_id, post.ratee_id]);
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
        padding: 0,
      }}>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, position: 'relative', minHeight: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: theme === 'dark' ? '#23272f' : '#e3eafc', color: '#a3b1c6', fontSize: 28 }}>
              <FaUserCircle />
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: theme === 'dark' ? '#f1f1f1' : '#232a36', fontFamily: "'FK Grotesk', 'Poppins', sans-serif" }}>{rater?.name || 'Someone'}</span>
            <span style={{ margin: '0 6px', color: '#888', fontWeight: 400, fontSize: 16 }}>rated</span>
            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 16 }}>{ratee?.name || 'someone'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, margin: '4px 0' }}>
            {absValue === 0 ? (
              <span style={{ color: '#888', fontSize: 15, fontWeight: 500 }}>No stars</span>
            ) : (
              Array.from({ length: absValue }).map((_, i) => (
                <FaStar key={`star-${post.id || ''}-${i}`} style={{ color: isPositive ? '#FFD700' : '#e53935', fontSize: 22, marginRight: 2, filter: isPositive ? '' : 'drop-shadow(0 0 2px #e53935)' }} />
              ))
            )}
            <span style={{ marginLeft: 8, fontSize: 15, color: isPositive ? '#FFD700' : isNegative ? '#e53935' : '#888', fontWeight: 600 }}>
              {value > 0 ? `+${value}` : value < 0 ? value : value}
            </span>
          </div>
          {post.comment && (
            <div style={{ fontSize: 15, color: theme === 'dark' ? '#b0b0b0' : '#444', background: theme === 'dark' ? '#23272f' : '#f7fafd', borderRadius: 8, padding: '10px 14px', margin: '8px 0 0 0', fontStyle: 'italic', width: '100%', boxSizing: 'border-box', wordBreak: 'break-word' }}>
              {post.comment}
            </div>
          )}
          {/* Time moved to right bottom corner */}
          <div style={{ position: 'absolute', right: 18, bottom: 10, fontSize: 13, color: '#b0b0b0', marginTop: 8, textAlign: 'right' }}>{timeAgo(post.created_at)}</div>
        </div>
      </div>
    );
  }

  // --- POST FEED ITEM BRANCH ---
  // Highlight tags in the feed display
  function highlightTags(html, tags, tagMap) {
    if (!tags || tags.length === 0) return html;
    let out = html;
    tags.forEach(tag => {
      const user = tagMap && tagMap[tag];
      const name = user ? user.name : tag;
      const email = user ? user.email : tag;
      // Replace @tag with styled span (avoid double-highlighting)
      const regex = new RegExp(`@${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\w@])`, 'g');
      out = out.replace(
        regex,
        `<span class="tag-blot" style="background:#e3eafc;color:#1976d2;border-radius:6px;padding:2px 6px;margin:0 2px;font-weight:600;font-family:'FK Grotesk','Poppins',sans-serif;" title="${email}">${name}</span>`
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
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        {/* Tagged users section with icon */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ margin: '4px 0 8px 0', fontSize: 15, color: '#1976d2', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaUserPlus style={{ fontSize: 18, verticalAlign: 'middle' }} />
            {post.tags.map(u => (
              <span key={u.id} style={{ background: '#e3eafc', color: '#1976d2', borderRadius: 6, padding: '2px 6px', margin: '0 2px', fontWeight: 600, fontFamily: "'FK Grotesk','Poppins',sans-serif", cursor: 'pointer' }} title={u.email}>
                {u.name}
              </span>
            ))}
          </div>
        )}
        {/* Author info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: theme === 'dark' ? '#23272f' : '#e3eafc', color: '#a3b1c6', fontSize: 28 }}>
            <FaUserCircle />
          </span>
          <span style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#f1f1f1' : '#232a36', fontFamily: "'FK Grotesk', 'Poppins', sans-serif" }}>{authorName || post.author_email}</span>
        </div>
        {/* Like button and count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '8px 0 2px 0',
          paddingRight: 12,
          paddingLeft: 0,
          fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleLike} style={{ background: 'none', border: 'none', borderRadius: 0, boxShadow: 'none', cursor: 'pointer', padding: 0, color: liked ? '#e74c3c' : '#a3b1c6', fontSize: 20, display: 'flex', alignItems: 'center' }} aria-label={liked ? 'Unlike' : 'Like'}>
              {liked ? <FaHeart /> : <FaRegHeart />}
            </button>
            <span style={{ fontSize: 15, color: theme === 'dark' ? '#f1f1f1' : '#232a36', fontWeight: 500 }}>{likeCount}</span>
          </div>
          <div style={{ fontSize: 13, color: '#b0b0b0', background: 'transparent', pointerEvents: 'none' }}>{timeAgo(post.created_at)}</div>
        </div>
      </div>
    </div>
  );
}

// --- FeedList ---
function FeedList({ posts, theme }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {posts.map(post => <FeedItem key={`${post._type}-${post.id}`} post={post} theme={theme} />)}
    </div>
  );
}

// --- PostComposerTabs ---
function PostComposerTabs({ onPost, user, projectId, appreciationFeed, refreshFeed }) {
  const { backendUser } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const theme = (typeof window !== 'undefined' && (document.body.classList.contains('theme-dark') || localStorage.getItem('theme') === 'dark')) ? 'dark' : 'light';

  // Appreciation/rating input state
  const [ratingMembers, setRatingMembers] = useState([]);
  const [ratingRatee, setRatingRatee] = useState('');
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSearch, setRatingSearch] = useState('');
  const [ribbonMessage, setRibbonMessage] = useState('');
  const [ribbonType, setRibbonType] = useState('success');
  // Add missing user search state
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  // Add state for selected user display
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch project members when tab is active
  useEffect(() => {
    if (activeTab !== 'appreciations' || !projectId) return;
    const fetchMembers = async () => {
      try {
        const token = user && (await user.getIdToken());
        const data = await fetchProjectMembers(token, projectId);
        setRatingMembers(data.members || []);
      } catch { setRatingMembers([]); }
    };
    fetchMembers();
  }, [activeTab, projectId, user]);

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
    const root = map[backendUser?.id]; // backendUser.id is numeric user ID
    if (!root) return [];
    return collectSubtree(root);
  }

  // Live backend search for users as you type
  useEffect(() => {
    let cancelled = false;
    if (activeTab !== 'appreciations' || !projectId || !ratingSearch || ratingSearch.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setUserSearchLoading(true);
    const fetchUsers = async () => {
      try {
        const token = user && (await user.getIdToken());
        const res = await searchUsers(token, { search: ratingSearch, projectId });
        // Filter out self from the results
        const filtered = (res.users || []).filter(u => u.id !== backendUser?.id);
        if (!cancelled) setUserSearchResults(filtered);
      } catch {
        if (!cancelled) setUserSearchResults([]);
      } finally {
        if (!cancelled) setUserSearchLoading(false);
      }
    };
    fetchUsers();
    return () => { cancelled = true; };
  }, [ratingSearch, projectId, user, activeTab]);

  // Submit appreciation/rating
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!projectId || !ratingRatee) return;
    if (!backendUser || !backendUser.id) {
      setRibbonType('error');
      setRibbonMessage('User context not ready. Please wait and try again.');
      setTimeout(() => setRibbonMessage(''), 2500);
      return;
    }
    setRatingLoading(true);
    try {
      const token = user && (await user.getIdToken());
      const rater_id = backendUser.id; // Use numeric user ID
      const newRating = await createRating({
        project_id: projectId,
        rater_id,
        ratee_id: ratingRatee,
        value: ratingValue,
        comment: ratingComment,
        token,
      });
      setRibbonType('success');
      setRibbonMessage('Appreciation/Rating submitted!');
      setTimeout(() => setRibbonMessage(''), 2500);
      setRatingRatee('');
      setRatingValue(0);
      setRatingComment('');
      setRatingMembers([]);
      setSelectedUser(null);
      setUserSearchResults([]);
      // Refresh feed after rating
      if (refreshFeed) await refreshFeed();
    } catch (e) {
      setRibbonType('error');
      setRibbonMessage('Failed to submit appreciation/rating.');
      setTimeout(() => setRibbonMessage(''), 2500);
    } finally {
      setRatingLoading(false);
    }
  };

  // Modern minimalist card style
  const cardStyle = {
    ...FK_FONT,
    borderRadius: 18,
    boxShadow: theme === 'dark'
      ? '0 4px 24px 0 rgba(24,26,32,0.28)'
      : '0 4px 24px 0 rgba(163,177,198,0.18)',
    background: theme === 'dark'
      ? 'linear-gradient(135deg, #23272f 80%, #313543 100%)'
      : 'linear-gradient(135deg, #f7fafd 80%, #e0e5ec 100%)',
    padding: 0,
    marginBottom: 32,
    width: '100%',
    maxWidth: 600,
    position: 'relative',
    marginLeft: 'auto',
    marginRight: 'auto',
    border: 'none',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s, background 0.2s',
  };

  // Modern tab bar
  const tabBarStyle = {
    display: 'flex',
    background: 'transparent',
    borderBottom: '1.5px solid ' + (theme === 'dark' ? '#313543' : '#dbe3ef'),
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    padding: '0 24px',
    marginTop: 0,
    gap: 0,
  };

  // Modern tab button
  const tabBtnStyle = isActive => ({
    flex: 1,
    padding: '14px 0 6px 0',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '2px solid #1976d2' : '2px solid transparent',
    color: isActive ? (theme === 'dark' ? '#fff' : '#232a36') : (theme === 'dark' ? '#b0b0b0' : '#b0b0b0'),
    fontWeight: 400,
    fontSize: 20,
    cursor: 'pointer',
    fontFamily: "'FK Grotesk', 'Poppins', Arial, sans-serif",
    outline: 'none',
    transition: 'color 0.18s, border-bottom 0.18s',
    boxShadow: 'none',
    borderRadius: 0,
    margin: 0,
    position: 'relative',
    letterSpacing: 0.1,
  });

  // Modern tab content
  const tabContentStyle = {
    padding: '14px 16px 10px 16px',
    background: 'transparent',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    minHeight: 80,
    boxSizing: 'border-box',
  };

  // Responsive: inject a style tag for mobile adjustments
  const responsiveStyle = `
    @media (max-width: 700px) {
      .modern-minimal-post-card {
        max-width: 99vw !important;
        border-radius: 12px !important;
        margin-bottom: 18px !important;
      }
      .modern-minimal-post-card .tab-content {
        padding: 14px 4vw 10px 4vw !important;
      }
      .modern-minimal-post-card button {
        font-size: 15px !important;
        padding: 12px 0 8px 0 !important;
      }
    }
    .modern-minimal-post-card button:hover {
      background: rgba(25,118,210,0.06) !important;
      color: #1976d2 !important;
    }
    .modern-minimal-post-card button:focus {
      background: rgba(25,118,210,0.10) !important;
      color: #1976d2 !important;
    }
  `;

  // If backendUser is not ready, show loading spinner/message for appreciations tab
  if (activeTab === 'appreciations' && (!backendUser || !backendUser.id)) {
    return (
      <div style={{ padding: 32, textAlign: 'center', fontSize: 18 }}>
        <span>Loading user context...</span>
      </div>
    );
  }

  return (
    <>
      <style>{responsiveStyle}
      {`
      .custom-range-slider {
        width: 100%;
        height: 40px;
        margin: 0;
        padding: 0;
        background: ${theme === 'dark' ? '#23272f' : '#e0e0e0'};
        border-radius: 10px;
        box-shadow: ${theme === 'dark' ? '-2px -2px 8px #313543, 2px 2px 8px #181a20' : '-2px -2px 8px #fff, 2px 2px 8px rgba(0,0,0,0.08)'};
        outline: none;
        appearance: none;
      }
      .custom-range-slider:focus {
        outline: none;
      }
      .custom-range-slider::-webkit-slider-runnable-track {
        height: 16px;
        border-radius: 10px;
        background: ${theme === 'dark' ? '#23272f' : '#e0e0e0'};
        box-shadow: ${theme === 'dark' ? 'inset -2px -2px 8px #313543, inset 2px 2px 8px #181a20' : 'inset -2px -2px 8px #fff, inset 2px 2px 8px rgba(0,0,0,0.08)'};
        display: flex;
        align-items: center;
      }
      .custom-range-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 36px;
        height: 36px;
        background: ${theme === 'dark' ? '#313543' : '#e0e0e0'};
        background-image: linear-gradient(-45deg, ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)'}, transparent);
        border-radius: 50%;
        box-shadow: ${theme === 'dark' ? '-1px -1px 2px #23272f, 1px 1px 2px #181a20' : '-1px -1px 2px #fff, 1px 1px 2px rgba(0,0,0,0.13)'};
        position: relative;
        top: -10px;
        border: none;
        transition: box-shadow 0.2s;
      }
      .custom-range-slider:focus::-webkit-slider-thumb {
        box-shadow: 0 0 0 3px ${theme === 'dark' ? '#1976d244' : '#b3c6ff44'};
      }
      .custom-range-slider::-moz-range-thumb {
        width: 36px;
        height: 36px;
        background: ${theme === 'dark' ? '#313543' : '#e0e0e0'};
        background-image: linear-gradient(-45deg, ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)'}, transparent);
        border-radius: 50%;
        box-shadow: ${theme === 'dark' ? '-1px -1px 2px #23272f, 1px 1px 2px #181a20' : '-1px -1px 2px #fff, 1px 1px 2px rgba(0,0,0,0.13)'};
        border: none;
        transition: box-shadow 0.2s;
      }
      .custom-range-slider:focus::-moz-range-thumb {
        box-shadow: 0 0 0 3px ${theme === 'dark' ? '#1976d244' : '#b3c6ff44'};
      }
      .custom-range-slider::-ms-thumb {
        width: 36px;
        height: 36px;
        background: ${theme === 'dark' ? '#313543' : '#e0e0e0'};
        background-image: linear-gradient(-45deg, ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)'}, transparent);
        border-radius: 50%;
        box-shadow: ${theme === 'dark' ? '-1px -1px 2px #23272f, 1px 1px 2px #181a20' : '-1px -1px 2px #fff, 1px 1px 2px rgba(0,0,0,0.13)'};
        border: none;
        transition: box-shadow 0.2s;
      }
      .custom-range-slider::-ms-fill-lower,
      .custom-range-slider::-ms-fill-upper {
        background: ${theme === 'dark' ? '#23272f' : '#e0e0e0'};
        border-radius: 10px;
        box-shadow: ${theme === 'dark' ? 'inset -2px -2px 8px #313543, inset 2px 2px 8px #181a20' : 'inset -2px -2px 8px #fff, inset 2px 2px 8px rgba(0,0,0,0.08)'};
      }
      .custom-range-slider::-moz-range-track {
        height: 16px;
        border-radius: 10px;
        background: ${theme === 'dark' ? '#23272f' : '#e0e0e0'};
        box-shadow: ${theme === 'dark' ? 'inset -2px -2px 8px #313543, inset 2px 2px 8px #181a20' : 'inset -2px -2px 8px #fff, inset 2px 2px 8px rgba(0,0,0,0.08)'};
        display: flex;
        align-items: center;
      }
      .custom-range-slider::-ms-tooltip {
        display: none;
      }
      .custom-range-slider::-ms-thumb {
        width: 36px;
        height: 36px;
      }
      .custom-range-slider:focus::-ms-fill-lower {
        background: ${theme === 'dark' ? '#23272f' : '#e0e0e0'};
      }
      .custom-range-slider:focus::-ms-fill-upper {
        background: ${theme === 'dark' ? '#23272f' : '#e0e0e0'};
      }
      .custom-range-slider:disabled {
        opacity: 0.5;
      }
      `}
      </style>
      <div className="modern-minimal-post-card" style={cardStyle}>
        {/* Modern Tabs */}
        <div style={tabBarStyle}>
          <button
            onClick={() => setActiveTab('create')}
            style={tabBtnStyle(activeTab === 'create')}
            aria-label="Create a Post"
          >
            <FaRegEdit size={22} style={{ verticalAlign: 'middle' }} />
          </button>
          <button
            onClick={() => setActiveTab('appreciations')}
            style={tabBtnStyle(activeTab === 'appreciations')}
            aria-label="Appreciations & Ratings"
          >
            <FaRegStar size={22} style={{ verticalAlign: 'middle' }} />
          </button>
        </div>
        {/* Tab content */}
        <div className="tab-content" style={{ ...tabContentStyle, padding: '24px 20px 18px 20px', background: 'transparent', borderRadius: 0, minHeight: 80, boxSizing: 'border-box' }}>
          {activeTab === 'create' && (
            <PostComposer onPost={onPost} user={user} projectId={projectId} />
          )}
          {activeTab === 'appreciations' && (
            <div
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, #23272f 80%, #313543 100%)'
                  : 'linear-gradient(135deg, #f7fafd 80%, #e0e5ec 100%)',
                borderRadius: 18,
                boxShadow: theme === 'dark'
                  ? '0 4px 24px 0 rgba(24,26,32,0.28)'
                  : '0 4px 24px 0 rgba(163,177,198,0.18)',
                padding: '32px 24px 24px 24px',
                margin: '0 auto 20px auto',
                maxWidth: 600,
                width: '100%',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontFamily: "'FK Grotesk', 'Poppins', Arial, sans-serif",
                color: theme === 'dark' ? '#f1f1f1' : '#232a36',
                boxSizing: 'border-box',
              }}
            >
              <form
                onSubmit={handleSubmitRating}
                style={{ width: '100%', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, margin: 0 }}
              >
                <div style={{ maxWidth: 360, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <input
                    type="text"
                    placeholder="Search user..."
                    value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : ratingSearch}
                    onChange={e => {
                      setRatingSearch(e.target.value);
                      setSelectedUser(null);
                      setRatingRatee('');
                    }}
                    style={{
                      width: '90%',
                      minWidth: 200,
                      padding: 10,
                      borderRadius: 10,
                      border: theme === 'dark' ? '1.5px solid #313543' : 'none',
                      boxShadow: theme === 'dark' ? '0 2px 8px #181a20' : '0 2px 8px #e0e0e0',
                      fontFamily: 'inherit',
                      fontSize: 16,
                      background: theme === 'dark' ? '#2d313a' : '#f7fafd',
                      color: theme === 'dark' ? '#fff' : '#232a36',
                      marginBottom: 8,
                      outline: 'none',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      display: 'block',
                      boxSizing: 'border-box',
                      transition: 'background 0.18s, color 0.18s',
                    }}
                    disabled={!!selectedUser}
                  />
                  {selectedUser && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, background: theme === 'dark' ? '#313543' : '#e3eafc', borderRadius: 16, padding: '4px 14px 4px 10px', marginBottom: 8, fontWeight: 600, color: '#1976d2', fontSize: 16, fontFamily: "'FK Grotesk', 'Poppins', sans-serif", boxShadow: '0 1px 4px #0001', marginTop: 2, maxWidth: 340, width: '100%', justifyContent: 'center', transition: 'background 0.18s' 
                    }}>
                      <FaUserPlus style={{ color: '#1976d2', fontSize: 18, marginRight: 4 }} />
                      <span style={{ fontWeight: 700, color: '#1976d2', fontFamily: "'FK Grotesk', 'Poppins', sans-serif", fontSize: 16 }}>{selectedUser.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(null);
                          setRatingRatee('');
                          setRatingSearch('');
                        }}
                        style={{ background: 'none', border: 'none', color: '#b00020', fontWeight: 700, fontSize: 18, cursor: 'pointer', marginLeft: 4, lineHeight: 1, padding: 0 }}
                        aria-label="Remove selected user"
                      >×</button>
                    </div>
                  )}
                  {!selectedUser && (
                    <div style={{
                      maxHeight: 120,
                      overflowY: 'auto',
                      border: 'none',
                      borderRadius: 10,
                      background: theme === 'dark' ? '#23272f' : '#f7fafd',
                      boxShadow: theme === 'dark' ? '0 2px 8px #23272f' : '0 2px 8px #e0e0e0',
                      width: '100%',
                      maxWidth: 340,
                      margin: '0 auto',
                      color: theme === 'dark' ? '#f1f1f1' : '#232a36',
                      transition: 'background 0.18s, color 0.18s',
                    }}>
                      {userSearchLoading ? (
                        <div style={{ padding: 8, color: '#888' }}>Searching...</div>
                      ) : userSearchResults.length > 0 ? (
                        userSearchResults.map(m => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setRatingRatee(m.id);
                              setSelectedUser(m);
                              setRatingSearch('');
                            }}
                            style={{
                              padding: 10,
                              cursor: 'pointer',
                              background: ratingRatee === m.id ? (theme === 'dark' ? '#232a36' : '#e3eafc') : 'transparent',
                              color: ratingRatee === m.id ? '#1976d2' : (theme === 'dark' ? '#f1f1f1' : '#232a36'),
                              borderRadius: 8,
                              fontWeight: 500,
                              textAlign: 'center',
                              transition: 'background 0.18s, color 0.18s',
                            }}
                          >
                            {m.name} ({m.email})
                          </div>
                        ))
                      ) : ratingSearch.length >= 2 ? (
                        <div style={{ padding: 8, color: '#888' }}>No users found</div>
                      ) : null}
                    </div>
                  )}
                  <div style={{ width: '100%', maxWidth: 340, margin: '16px auto 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: theme === 'dark' ? '#f1f1f1' : '#232a36', fontFamily: "'FK Grotesk', 'Poppins', sans-serif", textAlign: 'center', transition: 'color 0.18s' }}>Rating Value</div>
                    <input
                      type="range"
                      min={-5}
                      max={5}
                      step={0.25}
                      value={ratingValue}
                      onChange={e => setRatingValue(parseFloat(e.target.value))}
                      className="custom-range-slider"
                      style={{ width: '90%', minWidth: 200, boxSizing: 'border-box', margin: '0 auto', display: 'block' }}
                    />
                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, marginTop: 6, color: theme === 'dark' ? '#f1f1f1' : '#232a36', fontFamily: "'FK Grotesk', 'Poppins', sans-serif", transition: 'color 0.18s' }}>{ratingValue}</div>
                  </div>
                  <div style={{ width: '100%', maxWidth: 340, margin: '16px auto 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    <textarea
                      value={ratingComment}
                      onChange={e => {
                        if (e.target.value.length <= 500) setRatingComment(e.target.value);
                      }}
                      rows={3}
                      placeholder="Add your rating comments here.."
                      style={{
                        width: '90%',
                        minWidth: 200,
                        padding: 10,
                        borderRadius: 10,
                        border: theme === 'dark' ? '1.5px solid #313543' : 'none',
                        boxShadow: theme === 'dark' ? '0 2px 8px #181a20' : '0 2px 8px #e0e0e0',
                        fontFamily: 'inherit',
                        fontSize: 15,
                        background: theme === 'dark' ? '#2d313a' : '#f7fafd',
                        color: theme === 'dark' ? '#fff' : '#232a36',
                        resize: 'vertical',
                        minHeight: 60,
                        outline: 'none',
                        margin: '0 auto',
                        display: 'block',
                        boxSizing: 'border-box',
                        transition: 'background 0.18s, color 0.18s',
                      }}
                    />
                    <div style={{ width: '90%', minWidth: 200, textAlign: 'right', fontSize: 13, color: '#888', marginTop: 2, fontFamily: "'FK Grotesk', 'Poppins', sans-serif", marginLeft: 'auto', marginRight: 'auto' }}>
                      {ratingComment.length} / 500
                    </div>
                  </div>
                  <div style={{ width: '100%', maxWidth: 340, display: 'flex', justifyContent: 'flex-end', marginTop: 18, marginLeft: 'auto', marginRight: 'auto' }}>
                    <button
                      type="submit"
                      disabled={ratingLoading || !projectId || !ratingRatee}
                      style={{
                        padding: '10px 32px',
                        borderRadius: 12,
                        background: ratingLoading || !projectId || !ratingRatee ? (theme === 'dark' ? '#313543' : '#e0e0e0') : '#1976d2',
                        color: ratingLoading || !projectId || !ratingRatee ? (theme === 'dark' ? '#888' : '#888') : '#fff',
                        border: 'none',
                        fontWeight: 700,
                        fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
                        fontSize: 17,
                        boxShadow: theme === 'dark' ? '0 2px 8px #23272f' : '0 2px 8px #e0e0e0',
                        cursor: ratingLoading || !projectId || !ratingRatee ? 'not-allowed' : 'pointer',
                        transition: 'background 0.18s, color 0.18s',
                      }}
                    >{ratingLoading ? 'Submitting...' : 'Submit'}</button>
                  </div>
                </div>
              </form>
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
                }}>{ribbonMessage}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Main FeedsPage ---
export default function FeedsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    const storedProjectId = localStorage.getItem('selectedProjectId');
    if (storedProjectId) {
      setProjectId(storedProjectId);
    } else {
      setError('No project selected.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = user && (await user.getIdToken());
        const postsRes = await axios.get(`${API_BASE_URL}/posts?projectId=${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
        setPosts(postsRes.data.posts || []);
        const ratingsList = await fetchRatings({ project_id: projectId, token });
        setRatings(ratingsList || []);
      } catch (e) {
        setError('Failed to fetch posts or ratings');
      } finally {
        setLoading(false);
      }
    }
    if (projectId && user) fetchData();
  }, [projectId, user]);

  // Merge posts and ratings, sort by created_at
  const mergedFeed = [
    ...posts.map(p => ({ ...p, _type: 'post' })),
    ...ratings.map(r => ({ ...r, _type: 'rating' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // For the tab: only appreciations/ratings
  const appreciationFeed = ratings.map(r => ({ ...r, _type: 'rating' })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

  useEffect(() => {
    // If project name is missing but ID is present, try to recover it from navigation state or backend
    const projectId = localStorage.getItem('selectedProjectId');
    let projectName = localStorage.getItem('selectedProjectName');
    // Try to get from navigation state (if available)
    if (!projectName && window.history.state && window.history.state.usr && window.history.state.usr.projectName) {
      projectName = window.history.state.usr.projectName;
      localStorage.setItem('selectedProjectName', projectName);
    }
    // Optionally: fetch from backend if still missing (not implemented here)
  }, []);

  // Feed refresh function
  const refreshFeed = async () => {
    setLoading(true);
    try {
      const token = user && (await user.getIdToken());
      const postsRes = await axios.get(`${API_BASE_URL}/posts?projectId=${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPosts(postsRes.data.posts || []);
      const ratingsList = await fetchRatings({ project_id: projectId, token });
      setRatings(ratingsList || []);
    } catch (e) {
      setError('Failed to fetch posts or ratings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-bg, #f5f8ff)', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
        {/* 4. Conditionally render PostComposer only when projectId is available */}
        {projectId && <PostComposerTabs onPost={handlePost} user={user} projectId={projectId} appreciationFeed={appreciationFeed} refreshFeed={refreshFeed} />}
        {loading ? (
          <div style={{ ...FK_FONT, color: '#6a7ba2', textAlign: 'center', marginTop: 32 }}>Loading...</div>
        ) : error ? (
          <div style={{ ...FK_FONT, color: '#b00020', textAlign: 'center', marginTop: 32 }}>{error}</div>
        ) : (
          <FeedList posts={mergedFeed} theme={theme} />
        )}
      </div>
    </div>
  );
}