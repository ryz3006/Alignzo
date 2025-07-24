import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { MdWbSunny, MdDarkMode, MdMenuBook } from "react-icons/md";
import { getMyProjects } from "../api/users";
import { useLoading } from "../contexts/LoadingContext";

const ProjectSelectionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialProjects = (location.state && location.state.projects) || null;
  const initialUser = (location.state && location.state.user) || null;
  const [projects, setProjects] = useState(initialProjects);
  const [user, setUser] = useState(initialUser);
  const [selectedProject, setSelectedProject] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [loading, setPageLoading] = useState(!initialProjects);
  const [error, setError] = useState("");
  const { setLoading } = useLoading();

  useEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!projects) {
      // Fetch projects for the current user
      const fetchProjects = async () => {
        setPageLoading(true);
        setError("");
        try {
          const auth = getAuth();
          const firebaseUser = auth.currentUser;
          if (!firebaseUser) throw new Error("User not logged in");
          const token = await firebaseUser.getIdToken();
          const email = firebaseUser.email;
          const name = firebaseUser.displayName;
          const { projects: fetchedProjects } = await getMyProjects(token, email);
          setProjects(fetchedProjects);
          setUser({ email, name });
        } catch (err) {
          setError("Failed to load projects. Please try again or contact Admin.");
        } finally {
          setPageLoading(false);
        }
      };
      fetchProjects();
    }
  }, [projects]);

  const handleSelect = (e) => setSelectedProject(e.target.value);

  const handleContinue = () => {
    if (selectedProject) {
      setLoading(true);
      // ✅ FIX: Use loose equality (==) to match string from <select> with number/string ID
      const selectedProjectObj = projects.find(p => p.id == selectedProject);
      
      localStorage.setItem("selectedProjectId", selectedProject);
      localStorage.setItem("selectedProjectName", selectedProjectObj ? selectedProjectObj.name : "");
      navigate("/user/feeds", { state: { projectId: selectedProject } });
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await signOut(getAuth());
    navigate("/login");
    setTimeout(() => setLoading(false), 500);
  };

  if (loading) {
    return (
      <div className="login-bg" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--primary-bg)", position: "relative" }}>
        <div className="login-logo-row" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <MdMenuBook className="logo-icon login-logo-icon" style={{ width: 40, height: 40 }} />
            <span className="logo-text login-logo-text" style={{ fontFamily: "'FK Grotesk', 'Poppins', sans-serif", fontWeight: 700, fontSize: 24, color: "#a3b1c6", letterSpacing: 1 }}>Alignzo</span>
          </div>
        </div>
        <div style={{ fontFamily: "'FK Grotesk', 'Poppins', sans-serif", fontSize: 18, color: "#6a7ba2" }}>Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="login-bg" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--primary-bg)", position: "relative" }}>
      {/* Theme toggle */}
      <div className="login-theme-toggle" style={{ position: "absolute", top: 18, right: 18, zIndex: 2, display: "flex", alignItems: "center" }}>
        <input
          type="checkbox"
          className="theme-checkbox"
          id="theme-checkbox-project-select"
          checked={theme === "dark"}
          onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{ display: "none" }}
        />
        <label htmlFor="theme-checkbox-project-select" className={`theme-checkbox-label${theme === "dark" ? " dark" : ""}`} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} style={{ cursor: "pointer" }}>
          <span className="theme-ball">
            {theme === "dark" ? <MdDarkMode className="theme-ball-icon" /> : <MdWbSunny className="theme-ball-icon" />}
          </span>
        </label>
      </div>
      {/* Logout button */}
      <button onClick={handleLogout} style={{ position: "absolute", top: 18, left: 18, background: "#fff", color: "#b00020", border: "1px solid #b00020", fontWeight: 600, fontFamily: "'FK Grotesk', 'Poppins', sans-serif", borderRadius: 6, padding: "8px 18px", cursor: "pointer", boxShadow: "0 2px 8px #b0002022" }}>Logout</button>
      {/* Logo and welcome */}
      <div className="login-logo-row" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <MdMenuBook className="logo-icon login-logo-icon" style={{ width: 40, height: 40 }} />
          <span className="logo-text login-logo-text" style={{ fontFamily: "'FK Grotesk', 'Poppins', sans-serif", fontWeight: 700, fontSize: 24, color: "#a3b1c6", letterSpacing: 1 }}>Alignzo</span>
        </div>
      </div>
      <div className="neumorphic login-card" style={{ maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxSizing: "border-box", padding: 32 }}>
        {error ? (
          <div style={{ color: "#b00020", fontFamily: "'FK Grotesk', 'Poppins', sans-serif", marginBottom: 16 }}>{error}</div>
        ) : projects && projects.length > 0 ? (
          <>
            <div style={{ width: "100%", textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'FK Grotesk', 'Poppins', sans-serif", fontWeight: 600, fontSize: 22, marginBottom: 8 }}>Welcome{user && user.name ? `, ${user.name}` : ""}!</div>
              <div style={{ fontFamily: "'FK Grotesk', 'Poppins', sans-serif", fontSize: 16, color: "#6a7ba2" }}>Please select a project to continue:</div>
            </div>
            <select
              value={selectedProject}
              onChange={handleSelect}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 6,
                border: "1.5px solid #a3b1c6",
                fontSize: 16,
                fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
                marginBottom: 24,
                background: theme === "dark" ? "#232a36" : "#fff",
                color: theme === "dark" ? "#f5f8ff" : "#232a36",
                boxShadow: "0 2px 8px #a3b1c622",
                outline: "none",
                appearance: "none"
              }}
            >
              <option value="" disabled>Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              className="login-btn"
              onClick={handleContinue}
              disabled={!selectedProject}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: "6px",
                background: selectedProject ? "#a3b1c6" : "#ccc",
                color: "#fff",
                border: "none",
                fontWeight: "bold",
                cursor: selectedProject ? "pointer" : "not-allowed",
                fontSize: "16px",
                fontFamily: "'FK Grotesk', 'Poppins', sans-serif"
              }}
            >
              Continue
            </button>
          </>
        ) : (
          <div style={{ color: "#b00020", fontFamily: "'FK Grotesk', 'Poppins', sans-serif", textAlign: "center" }}>
            No projects assigned to this user. Please contact Admin.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSelectionPage; 