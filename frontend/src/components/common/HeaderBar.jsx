import React, { useState, useEffect, useRef } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { useLoading } from "../../contexts/LoadingContext";
import {
  MdDashboard,
  MdTab,
  MdLogout,
  MdWbSunny,
  MdDarkMode,
  MdMenuBook,
  MdPerson,
  MdSettings,
  MdNotifications,
  MdSwapHoriz,
  MdMoreHoriz,
} from "react-icons/md";
import "../../neumorphism.css";
import "./HeaderBar.css";

const NAV_ITEMS = {
  admin: [
    { key: "dashboard", label: "Admin Dashboard", icon: <MdDashboard /> },
    { key: "users", label: "User Management", icon: <MdPerson /> },
    { key: "projects", label: "Project Management", icon: <MdTab /> },
    { key: "userfeeds", label: "User Feeds", icon: <MdNotifications /> },
    { key: "settings", label: "Settings Management", icon: <MdSettings /> },
  ],
  user: [
    { key: "dashboard", label: "Dashboard", icon: <MdDashboard /> },
    { key: "projects", label: "My Projects", icon: <MdTab /> },
    { key: "profile", label: "Profile", icon: <MdPerson /> },
  ],
};

const PAGE_LABELS = {
  dashboard: "Dashboard",
  users: "Users",
  projects: "Projects",
  userfeeds: "User Feeds",
  profile: "Profile",
};

const HeaderBar = ({ onNavChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: adminLogout, admin } = useAdminAuth();
  const { setLoading } = useLoading();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [shrunk, setShrunk] = useState(false);
  const [projectName, setProjectName] = useState('Project');
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef(null);

  const isAdmin = location.pathname.includes('/admin');
  // ✅ FIX: This line was missing. Add it back here.
  const navItems = isAdmin ? NAV_ITEMS.admin : NAV_ITEMS.user;

  useEffect(() => {
    function handleClickOutside(event) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuRef]);


  useEffect(() => {
    setProjectName(localStorage.getItem('selectedProjectName') || 'Project');

    let newTab = "dashboard";
    if (location.pathname.includes("settings")) newTab = "settings";
    else if (location.pathname.includes("projects")) newTab = "projects";
    else if (location.pathname.includes("users")) newTab = "users";
    else if (location.pathname.includes("user-feeds")) newTab = "userfeeds";
    else if (location.pathname.includes("profile")) newTab = "profile";
    
    setSelectedTab(newTab);

    if (onNavChange) onNavChange(PAGE_LABELS[newTab] || "Dashboard");
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, onNavChange]);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
      setShrunk(scrolled);
      if (scrolled) {
        document.body.classList.add('header-scrolled');
      } else {
        document.body.classList.remove('header-scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.classList.remove('header-scrolled');
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsCollapsed(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = async (item) => {
    setSelectedTab(item.key);
    setLoading(true);
    setTimeout(() => {
      if (isAdmin) {
        if (item.key === "dashboard") navigate("/admin/dashboard");
        else if (item.key === "users") navigate("/admin/users");
        else if (item.key === "projects") navigate("/admin/projects");
        else if (item.key === "userfeeds") navigate("/admin/user-feeds");
        else if (item.key === "settings") navigate("/admin/settings");
      } else {
        if (item.key === "dashboard") navigate("/user/feeds");
        else if (item.key === "projects") alert("My Projects clicked");
        else if (item.key === "profile") alert("Profile clicked");
      }
      setLoading(false);
      if (onNavChange) onNavChange(PAGE_LABELS[item.key] || "Dashboard");
    }, 300);
  };

  const handleLogout = async () => {
    setLoading(true);
    if (isAdmin) {
      adminLogout();
    } else {
      await signOut(getAuth());
    }
    navigate("/login");
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <header className={`header-bar${shrunk ? ' shrunk' : ''}`}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
        <MdMenuBook className="logo-icon" />
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px', marginRight: '10px', justifyContent: 'center' }}>
          <div className="logo-text" style={{ lineHeight: 1, padding: 0, margin: 0 }}>
            Alignzo
          </div>
          {!isAdmin && (
            <div style={{
              fontSize: 12,
              color: '#6a7ba2',
              marginTop: '-4px',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {projectName}
            </div>
          )}
        </div>
        {!isAdmin && (
          <button
            onClick={() => navigate('/user/select-project')}
            style={{ background: 'none', border: 'none', padding: 0, marginLeft: 8, cursor: 'pointer', color: '#1976d2', display: 'flex', alignItems: 'center', fontSize: 18 }}
            title="Switch Project"
          >
            <MdSwapHoriz />
          </button>
        )}
      </div>
      
      <div className="header-center" style={{ position: 'relative' }}>
        {isCollapsed ? (
          <>
            <button
              className="nav-item"
              onClick={() => setShowMobileMenu((prev) => !prev)}
              title="Navigation"
            >
              <MdMoreHoriz />
            </button>
            {showMobileMenu && (
              <div
                ref={mobileMenuRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'var(--primary-bg)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  zIndex: 100,
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  marginTop: '8px',
                  minWidth: '210px',
                  width: '70vw',
                  maxWidth: '320px',
                  right: 'auto',
                  left: 0
                }}
              >
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      handleNavClick(item);
                      setShowMobileMenu(false);
                    }}
                    className={`dropdown-item nav-dropdown-item ${selectedTab === item.key ? " active" : ""}`}
                    title={item.label}
                  >
                    {item.icon}
                    <span style={{ marginLeft: '12px' }}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <nav className="header-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item)}
                className={`nav-item${selectedTab === item.key ? " active" : ""}`}
                title={item.label}
                tabIndex={0}
              >
                {item.icon}
              </button>
            ))}
          </nav>
        )}
      </div>
      
      <div className="header-right">
        <div style={{ marginRight: 8 }}>
          <input
            type="checkbox"
            className="theme-checkbox"
            id="theme-checkbox"
            checked={theme === "dark"}
            onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
          <label htmlFor="theme-checkbox" className={`theme-checkbox-label${theme === "dark" ? " dark" : ""}`} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <span className="theme-ball">
              {theme === "dark" ? <MdDarkMode className="theme-ball-icon" /> : <MdWbSunny className="theme-ball-icon" />}
            </span>
          </label>
        </div>
        <div className="user-menu">
          <button 
            className="user-menu-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            title={isCollapsed ? `${isAdmin ? 'Admin' : 'User'} Menu` : ''}
          >
            <MdPerson />
          </button>
          {showDropdown && (
            <div className="user-dropdown">
              {isAdmin ? (
                <>
                  <div style={{ padding: '8px 16px', fontWeight: 600, fontFamily: "'FK Grotesk', Arial, sans-serif", color: 'var(--primary-color)', fontSize: 15, borderBottom: '1px solid #eee' }}>
                    {admin && admin.email ? admin.email : 'Admin'}
                  </div>
                  <button className="dropdown-item logout" onClick={handleLogout}> <MdLogout className="dropdown-icon" /> <span>Logout</span> </button>
                </>
              ) : (
                <>
                  <button className="dropdown-item" onClick={() => alert("Notifications page coming soon")}> <MdNotifications className="dropdown-icon" /> <span>Notifications</span> </button>
                  <button className="dropdown-item" onClick={() => alert("Profile clicked")}> <MdPerson className="dropdown-icon" /> <span>Profile</span> </button>
                  <button className="dropdown-item" onClick={() => alert("Settings clicked")}> <MdSettings className="dropdown-icon" /> <span>Settings</span> </button>
                  <button className="dropdown-item" onClick={() => { setShowDropdown(false); setLoading(true); navigate("/user/select-project"); setTimeout(() => setLoading(false), 500); }}> <MdSwapHoriz className="dropdown-icon" /> <span>Switch Project</span> </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={handleLogout}> <MdLogout className="dropdown-icon" /> <span>Logout</span> </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;