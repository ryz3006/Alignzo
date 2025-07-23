import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import axios from "axios";
import { MdCategory, MdPublic, MdWorkOutline, MdEdit, MdDelete, MdCheck, MdClose } from "react-icons/md";
import { useSettings } from "../../contexts/SettingsContext";

const baseTileStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--primary-highlight)',
  color: 'var(--primary-color)',
  borderRadius: 16,
  boxShadow: '0 2px 8px var(--primary-shadow)',
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  fontWeight: 600,
  fontSize: 20,
  minHeight: 80,
  cursor: 'pointer',
  margin: 12,
  padding: 24,
  transition: 'box-shadow 0.22s cubic-bezier(.4,1.3,.5,1), background 0.2s, transform 0.18s cubic-bezier(.4,1.3,.5,1)',
};
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.18)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const modalStyle = {
  background: 'var(--primary-bg)',
  borderRadius: 16,
  padding: 32,
  minWidth: 320,
  maxWidth: 420,
  boxShadow: '0 4px 24px var(--primary-shadow)',
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  color: 'var(--primary-color)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  position: 'relative', // Ensure close icon is visible
  maxHeight: '90vh',
  overflowY: 'auto',
};

const SettingsManagement = () => {
  const { adminToken } = useAdminAuth();
  const { fetchSettings } = useSettings();
  const [productNames, setProductNames] = useState([]);
  const [countries, setCountries] = useState([]);
  const [productInput, setProductInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [savingProducts, setSavingProducts] = useState(false);
  const [savingCountries, setSavingCountries] = useState(false);
  const [error, setError] = useState("");
  const [designations, setDesignations] = useState([]);
  const [designationInput, setDesignationInput] = useState("");
  const [savingDesignations, setSavingDesignations] = useState(false);
  const [modalType, setModalType] = useState(null); // 'products', 'countries', 'designations'
  const [modalLoading, setModalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // Track last saved state for each modal type
  const [lastSavedProductNames, setLastSavedProductNames] = useState([]);
  const [lastSavedCountries, setLastSavedCountries] = useState([]);
  const [lastSavedDesignations, setLastSavedDesignations] = useState([]);
  const [ribbonMessage, setRibbonMessage] = useState("");
  const [ribbonType, setRibbonType] = useState("success");

  const fetchProductNames = async () => {
    try {
      const res = await axios.get("/api/admin/dashboard/settings/product-names", { headers: { Authorization: `Bearer ${adminToken}` } });
      setProductNames(res.data.product_names || []);
      setLastSavedProductNames(res.data.product_names || []);
    } catch {
      setProductNames([]);
      setLastSavedProductNames([]);
    }
  };
  const fetchCountries = async () => {
    try {
      const res = await axios.get("/api/admin/dashboard/settings/countries", { headers: { Authorization: `Bearer ${adminToken}` } });
      setCountries(res.data.countries || []);
      setLastSavedCountries(res.data.countries || []);
    } catch {
      setCountries([]);
      setLastSavedCountries([]);
    }
  };
  const fetchDesignations = async () => {
    try {
      const res = await axios.get("/api/admin/dashboard/settings/designations", { headers: { Authorization: `Bearer ${adminToken}` } });
      setDesignations(res.data.designations || []);
      setLastSavedDesignations(res.data.designations || []);
    } catch {
      setDesignations([]);
      setLastSavedDesignations([]);
    }
  };

  // Fetch product names and countries on mount
  useEffect(() => {
    if (!adminToken) return;
    setError("");
    fetchProductNames();
    fetchCountries();
  }, [adminToken]);

  // Fetch designations on mount
  useEffect(() => {
    if (!adminToken) return;
    setError("");
    fetchDesignations();
  }, [adminToken]);

  // Save product names
  const saveProductNames = async () => {
    setSavingProducts(true);
    setError("");
    setSuccessMessage("");
    try {
      await axios.post("/api/admin/dashboard/settings/product-names", { product_names: productNames.map(p => p.name) }, { headers: { Authorization: `Bearer ${adminToken}` } });
      await fetchProductNames();
      await fetchSettings(); // Refresh global settings
      await new Promise(res => setTimeout(res, 1000));
      setSuccessMessage("Saved successfully!");
      setRibbonType("success");
      setRibbonMessage("Product names saved successfully.");
      setTimeout(() => setRibbonMessage(""), 2500);
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (e) {
      setError("Failed to save product names");
      setRibbonType("error");
      setRibbonMessage("Failed to save product names.");
      setTimeout(() => setRibbonMessage(""), 2500);
    }
    setSavingProducts(false);
  };

  // Save countries
  const saveCountries = async () => {
    setSavingCountries(true);
    setError("");
    setSuccessMessage("");
    try {
      await axios.post("/api/admin/dashboard/settings/countries", { countries: countries.map(c => c.name) }, { headers: { Authorization: `Bearer ${adminToken}` } });
      await fetchCountries();
      await fetchSettings(); // Refresh global settings
      await new Promise(res => setTimeout(res, 1000));
      setSuccessMessage("Saved successfully!");
      setRibbonType("success");
      setRibbonMessage("Countries saved successfully.");
      setTimeout(() => setRibbonMessage(""), 2500);
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (e) {
      setError("Failed to save countries");
      setRibbonType("error");
      setRibbonMessage("Failed to save countries.");
      setTimeout(() => setRibbonMessage(""), 2500);
    }
    setSavingCountries(false);
  };

  // Save designations
  const saveDesignations = async () => {
    setSavingDesignations(true);
    setError("");
    setSuccessMessage("");
    try {
      await axios.post("/api/admin/dashboard/settings/designations", { designations: designations.map(d => d.name) }, { headers: { Authorization: `Bearer ${adminToken}` } });
      await fetchDesignations();
      await fetchSettings(); // Refresh global settings
      await new Promise(res => setTimeout(res, 1000));
      setSuccessMessage("Saved successfully!");
      setRibbonType("success");
      setRibbonMessage("Designations saved successfully.");
      setTimeout(() => setRibbonMessage(""), 2500);
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (e) {
      setError("Failed to save designations");
      setRibbonType("error");
      setRibbonMessage("Failed to save designations.");
      setTimeout(() => setRibbonMessage(""), 2500);
    }
    setSavingDesignations(false);
  };

  // Update tile click handlers to re-fetch latest data before opening modal
  const handleTileClick = async (type) => {
    setModalLoading(true);
    if (type === 'products') await fetchProductNames();
    if (type === 'countries') await fetchCountries();
    if (type === 'designations') await fetchDesignations();
    setModalType(type);
    setModalLoading(false);
  };

  // Responsive styles
  const containerStyle = {
    maxWidth: 600,
    margin: "0 auto 32px auto",
    background: "var(--primary-bg)",
    borderRadius: 16,
    padding: 16,
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    boxSizing: "border-box",
    boxShadow: '0 2px 8px var(--primary-shadow)',
    color: 'var(--primary-color)',
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
    minWidth: 120,
    background: 'var(--primary-bg)',
    color: 'var(--primary-color)',
    border: '1px solid var(--primary-shadow)',
  };
  const buttonStyle = {
    padding: "8px 16px",
    borderRadius: 6,
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
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
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    color: 'var(--primary-color)',
  };
  const errorStyle = {
    color: "#b00020",
    marginBottom: 12
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 24 }}>Settings</h3>
      {ribbonMessage && (
        <div style={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          background: ribbonType === 'success' ? '#43a047' : '#b00020',
          color: '#fff',
          padding: '12px 32px',
          borderRadius: 10,
          fontWeight: 600,
          fontFamily: "'FK Grotesk', Arial, sans-serif",
          fontSize: 16,
          zIndex: 2001,
          boxShadow: '0 4px 18px #0003',
          letterSpacing: 1,
          minWidth: 220,
          textAlign: 'center',
          pointerEvents: 'none',
          transition: 'opacity 0.3s',
        }}>
          {ribbonMessage}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
        <AnimatedTile onClick={() => handleTileClick('products')}>
          <MdCategory style={{ fontSize: 32, marginRight: 12, verticalAlign: 'middle' }} /> Product Names
        </AnimatedTile>
        <AnimatedTile onClick={() => handleTileClick('countries')}>
          <MdPublic style={{ fontSize: 32, marginRight: 12, verticalAlign: 'middle' }} /> Countries
        </AnimatedTile>
        <AnimatedTile onClick={() => handleTileClick('designations')}>
          <MdWorkOutline style={{ fontSize: 32, marginRight: 12, verticalAlign: 'middle' }} /> Designations
        </AnimatedTile>
      </div>
      {modalType && (
        <div style={{ ...modalOverlayStyle, marginTop: 32, marginBottom: 32 }} onClick={() => setModalType(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: 32 }}>Loading...</div>
            ) : (
              <>
                {/* X close icon in top right */}
                <button
                  onClick={() => setModalType(null)}
                  style={{
                    position: 'absolute',
                    top: 18,
                    right: 24,
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontSize: 24,
                    fontWeight: 700,
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                  aria-label="Close"
                >&#10005;</button>
                <h4 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, marginTop: 8, textAlign: 'center' }}>
                  {modalType === 'products' ? 'Product Names' : modalType === 'countries' ? 'Countries' : 'Designations'}
                </h4>
                <SettingModalContent
                  type={modalType}
                  items={modalType === 'products' ? productNames : modalType === 'countries' ? countries : designations}
                  setItems={modalType === 'products' ? setProductNames : modalType === 'countries' ? setCountries : setDesignations}
                  inputValue={modalType === 'products' ? productInput : modalType === 'countries' ? countryInput : designationInput}
                  setInputValue={modalType === 'products' ? setProductInput : modalType === 'countries' ? setCountryInput : setDesignationInput}
                  saveItems={modalType === 'products' ? saveProductNames : modalType === 'countries' ? saveCountries : saveDesignations}
                  saving={modalType === 'products' ? savingProducts : modalType === 'countries' ? savingCountries : savingDesignations}
                  error={error}
                  setError={setError}
                  successMessage={successMessage}
                  lastSavedItems={modalType === 'products' ? lastSavedProductNames : modalType === 'countries' ? lastSavedCountries : lastSavedDesignations}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Modal content component
function SettingModalContent({ type, items, setItems, inputValue, setInputValue, saveItems, saving, error, setError, successMessage, lastSavedItems }) {
  const [editingIdx, setEditingIdx] = React.useState(null);
  const [editValue, setEditValue] = React.useState("");
  const inputStyle = {
    padding: 8,
    borderRadius: 6,
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    flex: 1,
    minWidth: 120,
    background: 'var(--primary-bg)',
    color: 'var(--primary-color)',
    border: '1px solid var(--primary-shadow)',
  };
  const buttonStyle = {
    padding: "8px 16px",
    borderRadius: 6,
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
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
    margin: 0,
    maxHeight: 180,
    overflowY: 'auto',
  };
  const listItemStyle = {
    marginBottom: 4,
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    color: 'var(--primary-color)',
  };
  const errorStyle = {
    color: "#b00020",
    marginBottom: 12
  };
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'var(--primary-bg)',
    color: 'var(--primary-color)',
    fontFamily: "'FK Grotesk', Arial, sans-serif",
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 4px var(--primary-shadow)',
  };
  const thStyle = {
    textAlign: 'left',
    padding: '8px 12px',
    background: 'var(--primary-highlight)',
    color: 'var(--primary-color)',
    fontWeight: 600,
    fontSize: 15,
    borderBottom: '1px solid var(--primary-shadow)',
  };
  const tdStyle = {
    padding: '8px 12px',
    borderBottom: '1px solid var(--primary-shadow)',
    fontSize: 15,
    background: 'var(--primary-bg)',
  };
  const scrollContainerStyle = {
    maxHeight: 180,
    overflowY: 'auto',
    marginBottom: 8,
    borderRadius: 8,
    border: '1px solid var(--primary-shadow)',
    background: 'var(--primary-bg)',
  };
  const iconButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    marginRight: 4,
    color: 'var(--primary-color)',
    fontSize: 20,
    verticalAlign: 'middle',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const tableHeader = type === 'products' ? 'Product Name' : type === 'countries' ? 'Country' : 'Designation';
  // Modal-level save status
  const isSaved = JSON.stringify(items) === JSON.stringify(lastSavedItems);
  return (
    <>
      {error && <div style={errorStyle}>{error}</div>}
      {successMessage && <div style={{ color: '#2e7d32', marginBottom: 12, fontWeight: 600 }}>{successMessage}</div>}
      {/* Modal-level save/unsaved status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 15, fontWeight: 500 }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', display: 'inline-block', background: isSaved ? '#43a047' : '#ffd600', border: isSaved ? '1.5px solid #388e3c' : '1.5px solid #ffb300' }}></span>
        {isSaved ? 'All changes saved' : 'Unsaved changes'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          placeholder={
            type === 'countries'
              ? 'Add Country'
              : `Add ${type.slice(0, -1)}`
          }
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={() => {
            if (inputValue && !items.some(i => i.name === inputValue)) setItems([...items, { name: inputValue, inUse: false }]);
            setInputValue("");
          }}
          style={buttonStyle}
        >Add</button>
      </div>
      <div style={scrollContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{tableHeader}</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.name}>
                <td style={tdStyle}>
                  {editingIdx === idx ? (
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={inputStyle}
                      autoFocus
                    />
                  ) : (
                    item.name
                  )}
                </td>
                <td style={tdStyle}>
                  {editingIdx === idx ? (
                    <>
                      <button
                        onClick={() => {
                          if (editValue && !items.some((i, iidx) => i.name === editValue && iidx !== idx)) {
                            const updated = items.map((i, iidx) => iidx === idx ? { ...i, name: editValue } : i);
                            setItems(updated);
                            setEditingIdx(null);
                          } else {
                            setError('Name must be unique and not empty');
                          }
                        }}
                        style={iconButtonStyle}
                        title="Save"
                        aria-label="Save"
                      >
                        <MdCheck />
                      </button>
                      <button
                        onClick={() => setEditingIdx(null)}
                        style={iconButtonStyle}
                        title="Cancel"
                        aria-label="Cancel"
                      >
                        <MdClose />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingIdx(idx);
                          setEditValue(item.name);
                        }}
                        style={iconButtonStyle}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <MdEdit />
                      </button>
                      <button
                        onClick={() => setItems(items.filter((x, iidx) => iidx !== idx))}
                        style={{ ...iconButtonStyle, color: item.inUse ? '#b0b0b0' : '#b00020' }}
                        disabled={item.inUse}
                        title={item.inUse ? 'Cannot delete: in use' : 'Remove'}
                        aria-label="Remove"
                      >
                        <MdDelete />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={saveItems}
        disabled={saving}
        style={{ ...buttonStyle, marginTop: 8 }}
      >{saving ? 'Saving...' : 'Save'}</button>
    </>
  );
}

function AnimatedTile({ children, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      style={{
        ...baseTileStyle,
        transform: hovered ? 'scale(1.045)' : 'scale(1)',
        boxShadow: hovered
          ? '0 8px 32px 0 var(--primary-shadow), 0 2px 12px 0 var(--primary-highlight)' 
          : baseTileStyle.boxShadow,
        background: hovered ? 'var(--accent)' : baseTileStyle.background,
        color: hovered ? '#fff' : baseTileStyle.color,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default SettingsManagement; 