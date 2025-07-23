import React, { useState, useEffect } from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate, Routes, Route } from "react-router-dom";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { FcGoogle } from "react-icons/fc";
import { MdMenuBook, MdWbSunny, MdDarkMode } from "react-icons/md";
import "../neumorphism.css";
import "./CombinedLoginPage.css";
import { useLoading } from "../contexts/LoadingContext";
import { getMyProjects } from "../api/users";
import ProjectSelectionPage from "./ProjectSelectionPage";

const CombinedLoginPage = () => {
  const navigate = useNavigate();
  const { login: adminLogin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("user"); // "user" or "admin"

  // Admin login state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // User login state
  const [userError, setUserError] = useState("");

  // Theme state (copied from HeaderBar for consistency)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });
  useEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const { setLoading } = useLoading();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setUserError("");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const token = await firebaseUser.getIdToken();
      const email = firebaseUser.email;
      // Validate assigned projects
      try {
        const { projects } = await getMyProjects(token, email);
        if (projects && projects.length > 0) {
          navigate("/user/select-project", { state: { projects, user: { email, name: firebaseUser.displayName } } });
          setTimeout(() => setLoading(false), 500);
          return;
        } else {
          setUserError(`No projects assigned to this user ${email}, please contact Admin`);
        }
      } catch (apiError) {
        // Try to parse backend error message
        if (apiError.message && (apiError.message.includes('User not found') || apiError.message.includes('404'))) {
          setUserError(`No projects assigned to this user ${email}, please contact Admin`);
        } else {
          setUserError("Google Sign-In failed: " + apiError.message);
        }
      }
    } catch (error) {
      setUserError("Google Sign-In failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      await adminLogin(adminEmail, adminPassword);
      navigate("/admin/dashboard");
      setTimeout(() => setLoading(false), 500);
      return;
    } catch (error) {
      setAdminError("Invalid credentials. Please try again.");
    } finally {
      setAdminLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="login-bg" style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--primary-bg)", position: "relative" }}>
      {/* Theme toggle at top right */}
      <div className="login-theme-toggle" style={{ position: "absolute", top: 18, right: 18, zIndex: 2, display: "flex", alignItems: "center" }}>
        <input
          type="checkbox"
          className="theme-checkbox"
          id="theme-checkbox-login"
          checked={theme === "dark"}
          onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{ display: "none" }}
        />
        <label htmlFor="theme-checkbox-login" className={`theme-checkbox-label${theme === "dark" ? " dark" : ""}`} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} style={{ cursor: "pointer" }}>
          <span className="theme-ball">
            {theme === "dark" ? <MdDarkMode className="theme-ball-icon" /> : <MdWbSunny className="theme-ball-icon" />}
          </span>
        </label>
      </div>
      {/* Centered logo above card */}
      <div className="login-logo-row" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <MdMenuBook className="logo-icon login-logo-icon" style={{ width: 40, height: 40 }} />
          <span className="logo-text login-logo-text" style={{ fontFamily: "'FK Grotesk', 'Poppins', sans-serif", fontWeight: 700, fontSize: 24, color: "#a3b1c6", letterSpacing: 1 }}>Alignzo</span>
        </div>
      </div>
      <div className="neumorphic login-card" style={{ maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxSizing: "border-box", padding: 32 }}>
        {/* Tab Navigation */}
        <div className="login-tabs" style={{ display: "flex", marginBottom: 32, gap: 12, width: "100%", justifyContent: "center" }}>
          <button
            onClick={() => setActiveTab("user")}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: activeTab === "user" ? "2px solid #a3b1c6" : "none",
              background: activeTab === "user" ? "#f5f8ff" : "#e9eef6",
              color: activeTab === "user" ? "#222" : "#666",
              cursor: "pointer",
              fontWeight: activeTab === "user" ? "bold" : "normal",
              borderRadius: "12px 0 0 12px",
              outline: "none",
              boxShadow: activeTab === "user" ? "0 2px 8px #a3b1c633" : "none",
              transition: "all 0.2s"
            }}
          >
            User Login
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: activeTab === "admin" ? "2px solid #a3b1c6" : "none",
              background: activeTab === "admin" ? "#f5f8ff" : "#e9eef6",
              color: activeTab === "admin" ? "#222" : "#666",
              cursor: "pointer",
              fontWeight: activeTab === "admin" ? "bold" : "normal",
              borderRadius: "0 12px 12px 0",
              outline: "none",
              boxShadow: activeTab === "admin" ? "0 2px 8px #a3b1c633" : "none",
              transition: "all 0.2s"
            }}
          >
            Admin Login
          </button>
        </div>

        {/* User Login Tab */}
        {activeTab === "user" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {userError && (
              <div style={{
                background: "#ffebee",
                color: "#b00020",
                borderRadius: 6,
                padding: "8px 16px",
                marginBottom: 12,
                width: "100%",
                textAlign: "center",
                fontWeight: 500,
                fontFamily: "'FK Grotesk', 'Poppins', sans-serif",
                fontSize: 15,
                boxShadow: "0 2px 8px #b0002022"
              }}>
                {userError}
              </div>
            )}
            <button
              className="login-btn"
              onClick={handleGoogleLogin}
              style={{
                width: "100%",
                padding: "12px 0",
                marginBottom: 8,
                background: "#4285f4",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10
              }}
            >
              <FcGoogle size={22} style={{ background: "#fff", borderRadius: "50%", marginRight: 8 }} />
              Sign in with Google
            </button>
          </div>
        )}

        {/* Admin Login Tab */}
        {activeTab === "admin" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <form onSubmit={handleAdminLogin} style={{ width: "100%" }}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="adminEmail" style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
                  Email
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                  placeholder="email id"
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="adminPassword" style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
                  Password
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                  placeholder="Enter password"
                />
              </div>
              {adminError && (
                <div style={{ color: "#b00020", marginBottom: 12, textAlign: "center", fontSize: "14px" }}>
                  {adminError}
                </div>
              )}
              <button
                className="login-btn"
                type="submit"
                disabled={adminLoading}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: "6px",
                  background: adminLoading ? "#ccc" : "#a3b1c6",
                  color: "#fff",
                  border: "none",
                  fontWeight: "bold",
                  cursor: adminLoading ? "not-allowed" : "pointer",
                  fontSize: "16px"
                }}
              >
                {adminLoading ? "Logging in..." : "Login as Admin"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CombinedLoginPage; 