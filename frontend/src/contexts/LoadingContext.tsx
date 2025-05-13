import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextState {
  loading: boolean;
  loadingMessage: string | null;
  setLoading: (isLoading: boolean) => void;
  setLoadingMessage: (message: string | null) => void;
}

const LoadingContext = createContext<LoadingContextState | undefined>(undefined);

export const useLoading = (): LoadingContextState => {
  const context = useContext(LoadingContext);
  
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const value = {
    loading,
    loadingMessage,
    setLoading,
    setLoadingMessage
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          {loadingMessage && <div className="loading-message">{loadingMessage}</div>}
        </div>
      )}
    </LoadingContext.Provider>
  );
}; 