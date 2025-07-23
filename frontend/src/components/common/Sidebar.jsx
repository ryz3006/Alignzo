import React, { useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { MdDashboard, MdTab, MdLogout, MdWbSunny, MdDarkMode, MdMenuBook, MdChevronLeft, MdChevronRight } from "react-icons/md";
import "../../neumorphism.css";
import "./Sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: adminLogout } = useAdminAuth();
  // Collapsed by default on mobile/tablet
  const getInitialCollapsed = () => window.innerWidth <= 900;
  const [collapsed, setCollapsed] = useState(getInitialCollapsed());

  // Check if we're on admin dashboard
  const isAdmin = location.pathname.includes('/admin');

  const navItems = isAdmin ? [
    { label: "Admin Dashboard", icon: <MdDashboard size={24} />, onClick: (navigate) => navigate("/admin/dashboard") },
    { label: "User Management", icon: <MdTab size={24} />, onClick: () => alert("User Management clicked") },
    { label: "Project Management", icon: <MdTab size={24} />, onClick: () => alert("Project Management clicked") },
  ] : [
    { label: "Dashboard", icon: <MdDashboard size={24} />, onClick: (navigate) => navigate("/user/dashboard") },
    { label: "My Projects", icon: <MdTab size={24} />, onClick: () => alert("My Projects clicked") },
    { label: "Profile", icon: <MdTab size={24} />, onClick: () => alert("Profile clicked") },
  ];

  const handleLogout = async () => {
    // Check if we're on admin dashboard
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

  React.useEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Remove open state logic from resize effect
  React.useEffect(() => {
    const handleResize = () => {
      setCollapsed(window.innerWidth <= 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sidebar collapse/expand button
  const handleSidebarToggle = () => setCollapsed((c) => !c);

  // Always render the sidebar
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header">
        {collapsed ? (
          <div className="sidebar-logo-collapsed">
            <MdMenuBook size={36} className="sidebar-logo" />
          </div>
        ) : (
          <div className="sidebar-logo-title-row">
            <MdMenuBook size={44} className="sidebar-logo" />
            <div className="sidebar-title-col">
              <span className="sidebar-title">Alignzo</span>
              <span className="sidebar-profile">{isAdmin ? "Admin Profile" : "User Profile"}</span>
            </div>
          </div>
        )}
      </div>
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item, idx) => (
            <li key={item.label} onClick={() => item.onClick(navigate)} className="sidebar-nav-item">
              {item.icon}
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-actions">
        <button onClick={toggleTheme} className="sidebar-action-btn">
          {theme === "dark" ? <MdDarkMode size={22} /> : <MdWbSunny size={22} />}
          {!collapsed && <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>}
        </button>
        <button onClick={handleLogout} className="sidebar-action-btn">
          <MdLogout size={22} />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={handleSidebarToggle}
          className="sidebar-collapse-btn hide-on-mobile"
          aria-label="Collapse sidebar"
        >
          {collapsed ? <MdChevronRight size={28} /> : <MdChevronLeft size={28} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar; 