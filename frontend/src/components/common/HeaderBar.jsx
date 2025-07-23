import React, { useState, useEffect } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { 
  MdDashboard, 
  MdTab, 
  MdLogout, 
  MdWbSunny, 
  MdDarkMode, 
  MdMenuBook, 
  MdExpandMore,
  MdExpandLess,
  MdPerson,
  MdSettings,
  MdNotifications
} from "react-icons/md";
import "../../neumorphism.css";
import "./HeaderBar.css";

const NAV_ITEMS = {
  admin: [
    { key: "dashboard", label: "Admin Dashboard", icon: <MdDashboard /> },
    { key: "users", label: "User Management", icon: <MdPerson /> },
    { key: "projects", label: "Project Management", icon: <MdTab /> },
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
  profile: "Profile",
};

const HeaderBar = ({ onNavChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: adminLogout } = useAdminAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [shrunk, setShrunk] = useState(false);

  // Check if we're on admin dashboard
  const isAdmin = location.pathname.includes('/admin');
  const navItems = isAdmin ? NAV_ITEMS.admin : NAV_ITEMS.user;

  useEffect(() => {
    // Set selected tab based on path
    if (location.pathname.includes("projects")) setSelectedTab("projects");
    else if (location.pathname.includes("users")) setSelectedTab("users");
    else if (location.pathname.includes("profile")) setSelectedTab("profile");
    else setSelectedTab("dashboard");
    if (onNavChange) onNavChange(PAGE_LABELS[selectedTab] || "Dashboard");
    // eslint-disable-next-line
  }, [location.pathname]);

  const handleNavClick = (item) => {
    setSelectedTab(item.key);
    if (isAdmin) {
      if (item.key === "dashboard") navigate("/admin/dashboard");
      else if (item.key === "users") navigate("/admin/users");
      else if (item.key === "projects") navigate("/admin/projects");
      else if (item.key === "settings") navigate("/admin/settings");
    } else {
      if (item.key === "dashboard") navigate("/user/dashboard");
      else if (item.key === "projects") alert("My Projects clicked");
      else if (item.key === "profile") alert("Profile clicked");
    }
    if (onNavChange) onNavChange(PAGE_LABELS[item.key] || "Dashboard");
  };

  const handleLogout = async () => {
    if (location.pathname.includes('/admin')) {
      adminLogout();
    } else {
      await signOut(getAuth());
    }
    navigate("/login");
  };

  // THEME TOGGLE LOGIC
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrolled = scrollTop > 50;
      setIsScrolled(scrolled);
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

  // Scroll detection for shrinking header
  useEffect(() => {
    const handleScroll = () => {
      setShrunk(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Responsive collapse
  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const headerClass = `header-bar spaced ${isCollapsed ? 'collapsed' : ''} ${isScrolled ? 'scrolled' : ''}`;

  return (
    <header className={`header-bar${shrunk ? ' shrunk' : ''}`}>
      <div className="header-left">
        <MdMenuBook className="logo-icon" />
        <span className="logo-text">Alignzo</span>
      </div>
      <div className="header-center">
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
      </div>
      <div className="header-right">
        {/* Theme toggle switch (modern, icon in ball) */}
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
              <button className="dropdown-item" onClick={() => alert("Notifications page coming soon")}> <MdNotifications className="dropdown-icon" /> <span>Notifications</span> </button>
              <button className="dropdown-item" onClick={() => alert("Profile clicked")}> <MdPerson className="dropdown-icon" /> <span>Profile</span> </button>
              <button className="dropdown-item" onClick={() => alert("Settings clicked")}> <MdSettings className="dropdown-icon" /> <span>Settings</span> </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}> <MdLogout className="dropdown-icon" /> <span>Logout</span> </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderBar; 