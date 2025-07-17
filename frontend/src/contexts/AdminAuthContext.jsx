import React, { createContext, useContext, useState } from "react";

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken"));
  const [admin, setAdmin] = useState(null);

  const login = async (email, password) => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Invalid credentials");
    const data = await res.json();
    setAdminToken(data.token);
    localStorage.setItem("adminToken", data.token);
    setAdmin({ email });
  };

  const logout = () => {
    setAdminToken(null);
    setAdmin(null);
    localStorage.removeItem("adminToken");
  };

  return (
    <AdminAuthContext.Provider value={{ adminToken, admin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext); 