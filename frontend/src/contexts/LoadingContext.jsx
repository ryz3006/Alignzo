import React, { createContext, useContext, useState, useRef } from "react";
import GlobalLoader from "../components/common/GlobalLoader";

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loading, setLoadingState] = useState(false);
  const timeoutRef = useRef(null);

  // setLoading ensures at least 0.3s loader
  const setLoading = (value) => {
    if (value) {
      setLoadingState(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      // Always show loader for at least 0.3s
      timeoutRef.current = setTimeout(() => setLoadingState(false), 300);
    }
  };

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {loading && <GlobalLoader />}
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext); 