import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";
import { useAdminAuth } from "./AdminAuthContext";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const { adminToken } = useAdminAuth();
  const [productNames, setProductNames] = useState([]);
  const [countries, setCountries] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const [prodRes, countryRes, desigRes] = await Promise.all([
        axios.get("/api/admin/dashboard/settings/product-names", { headers: { Authorization: `Bearer ${adminToken}` } }),
        axios.get("/api/admin/dashboard/settings/countries", { headers: { Authorization: `Bearer ${adminToken}` } }),
        axios.get("/api/admin/dashboard/settings/designations", { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);
      setProductNames(prodRes.data.product_names || []);
      setCountries(countryRes.data.countries || []);
      setDesignations(desigRes.data.designations || []);
    } catch {
      setProductNames([]);
      setCountries([]);
      setDesignations([]);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  return (
    <SettingsContext.Provider value={{ productNames, countries, designations, fetchSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
} 