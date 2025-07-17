import React from "react";

const handleGoogleLogin = () => {
  alert("Google Sign-In would be triggered here (Firebase Auth)");
};

const CombinedLoginPage = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e0e5ec" }}>
    <div style={{ background: "#fff", padding: 32, borderRadius: 12, boxShadow: "0 4px 24px #a3b1c6", minWidth: 320 }}>
      <h2 style={{ marginBottom: 24, textAlign: "center" }}>User Login</h2>
      <button
        onClick={handleGoogleLogin}
        style={{ width: "100%", padding: 10, borderRadius: 6, background: "#4285F4", color: "#fff", border: "none", fontWeight: "bold", cursor: "pointer", marginBottom: 16 }}
      >
        Sign in with Google
      </button>
      <div style={{ textAlign: "center", color: "#888" }}>
        (Firebase Google Auth)
      </div>
    </div>
  </div>
);

export default CombinedLoginPage; 