import React from "react";
import "../../neumorphism.css";
import "./Dashboard.css";

const UserDashboard = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px' }}>
    <div className="neumorphic dashboard-card" style={{ width: '100%', maxWidth: '800px', textAlign: 'center' }}>
      <h2>User Dashboard</h2>
      <p>Welcome, public user! This is your dashboard.</p>
      <div style={{ marginTop: 32, color: "#888" }}>
        (Add your dashboard widgets and content here)
      </div>
    </div>
    {/* Add more content to test scroll behavior */}
    <div style={{ marginTop: "32px", width: '100%', maxWidth: '800px' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="neumorphic dashboard-card" style={{ marginBottom: "24px", padding: "24px", textAlign: 'center' }}>
          <h3>Section {i + 1}</h3>
          <p>This is section {i + 1} to test the header scroll behavior. Scroll down to see the header minimize.</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </div>
      ))}
    </div>
  </div>
);

export default UserDashboard; 