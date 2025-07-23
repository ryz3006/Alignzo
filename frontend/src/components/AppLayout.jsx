import React, { useState, useEffect } from "react";
import HeaderBar from "./common/HeaderBar";

const AppLayout = ({ children }) => {
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShrunk(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app-layout">
      <HeaderBar onNavChange={setPageTitle} />
      <main
        className="app-main-content"
        style={{
          paddingTop: shrunk ? 70 : 100, // more space below header
          transition: 'padding-top 0.3s cubic-bezier(0.4, 0.2, 0.2, 1)',
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default AppLayout; 