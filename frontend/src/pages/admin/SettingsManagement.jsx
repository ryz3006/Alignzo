import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import axios from "axios";

const SettingsManagement = () => {
  const { adminToken } = useAdminAuth();
  const [productNames, setProductNames] = useState([]);
  const [countries, setCountries] = useState([]);
  const [productInput, setProductInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [savingProducts, setSavingProducts] = useState(false);
  const [savingCountries, setSavingCountries] = useState(false);
  const [error, setError] = useState("");

  // Fetch product names and countries on mount
  useEffect(() => {
    if (!adminToken) return;
    setError("");
    axios.get("/api/admin/dashboard/settings/product_names", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then(res => setProductNames(res.data.product_names || []))
      .catch(() => setProductNames([]));
    axios.get("/api/admin/dashboard/settings/countries", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then(res => setCountries(res.data.countries || []))
      .catch(() => setCountries([]));
  }, [adminToken]);

  // Save product names
  const saveProductNames = async () => {
    setSavingProducts(true);
    setError("");
    try {
      await axios.post("/api/admin/dashboard/settings/product_names", { product_names: productNames }, { headers: { Authorization: `Bearer ${adminToken}` } });
    } catch (e) {
      setError("Failed to save product names");
    }
    setSavingProducts(false);
  };

  // Save countries
  const saveCountries = async () => {
    setSavingCountries(true);
    setError("");
    try {
      await axios.post("/api/admin/dashboard/settings/countries", { countries }, { headers: { Authorization: `Bearer ${adminToken}` } });
    } catch (e) {
      setError("Failed to save countries");
    }
    setSavingCountries(false);
  };

  // Responsive styles
  const containerStyle = {
    maxWidth: 600,
    margin: "0 auto 32px auto",
    background: "#f7f8fa",
    borderRadius: 16,
    padding: 16,
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    boxSizing: "border-box"
  };
  const sectionStyle = {
    marginBottom: 32
  };
  const inputRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8
  };
  const inputStyle = {
    padding: 8,
    borderRadius: 6,
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    flex: 1,
    minWidth: 120
  };
  const buttonStyle = {
    padding: "8px 16px",
    borderRadius: 6,
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    background: "#e3f0ff",
    color: "#1a4b7a",
    fontWeight: 600,
    border: "none",
    cursor: "pointer"
  };
  const removeButtonStyle = {
    marginLeft: 8,
    color: "#b00020",
    background: "none",
    border: "none",
    cursor: "pointer"
  };
  const listStyle = {
    paddingLeft: 18,
    margin: 0
  };
  const listItemStyle = {
    marginBottom: 4,
    fontFamily: "'FK Grotesk', Arial, sans-serif"
  };
  const errorStyle = {
    color: "#b00020",
    marginBottom: 12
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>Settings</h3>
      {error && <div style={errorStyle}>{error}</div>}
      {/* Product Names Section */}
      <div style={sectionStyle}>
        <h4 style={{ fontWeight: 600 }}>Product Names</h4>
        <div style={inputRowStyle}>
          <input
            type="text"
            placeholder="Add product name"
            value={productInput}
            onChange={e => setProductInput(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={() => {
              if (productInput && !productNames.includes(productInput)) setProductNames([...productNames, productInput]);
              setProductInput("");
            }}
            style={buttonStyle}
          >Add</button>
        </div>
        <ul style={listStyle}>
          {productNames.map((p) => (
            <li key={p} style={listItemStyle}>
              {p}
              <button
                onClick={() => setProductNames(productNames.filter(x => x !== p))}
                style={removeButtonStyle}
              >Remove</button>
            </li>
          ))}
        </ul>
        <button
          onClick={saveProductNames}
          disabled={savingProducts}
          style={{ ...buttonStyle, marginTop: 8 }}
        >{savingProducts ? 'Saving...' : 'Save Product Names'}</button>
      </div>
      {/* Countries Section */}
      <div style={sectionStyle}>
        <h4 style={{ fontWeight: 600 }}>Countries</h4>
        <div style={inputRowStyle}>
          <input
            type="text"
            placeholder="Add country"
            value={countryInput}
            onChange={e => setCountryInput(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={() => {
              if (countryInput && !countries.includes(countryInput)) setCountries([...countries, countryInput]);
              setCountryInput("");
            }}
            style={buttonStyle}
          >Add</button>
        </div>
        <ul style={listStyle}>
          {countries.map((c) => (
            <li key={c} style={listItemStyle}>
              {c}
              <button
                onClick={() => setCountries(countries.filter(x => x !== c))}
                style={removeButtonStyle}
              >Remove</button>
            </li>
          ))}
        </ul>
        <button
          onClick={saveCountries}
          disabled={savingCountries}
          style={{ ...buttonStyle, marginTop: 8 }}
        >{savingCountries ? 'Saving...' : 'Save Countries'}</button>
      </div>
    </div>
  );
};

export default SettingsManagement; 