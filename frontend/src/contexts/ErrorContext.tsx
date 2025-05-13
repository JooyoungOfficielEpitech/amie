import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ErrorContextState {
  error: string | null;
  setError: (error: string | null) => void;
}

const ErrorContext = createContext<ErrorContextState | undefined>(undefined);

export const useError = (): ErrorContextState => {
  const context = useContext(ErrorContext);
  
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [error, setErrorState] = useState<string | null>(null);
  
  // 자동으로 일정 시간 후 에러 메시지를 닫음
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setErrorState(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  const setError = (message: string | null) => {
    setErrorState(message);
  };

  const value = {
    error,
    setError
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      {error && (
        <div className="error-toast">
          <div className="error-message">{error}</div>
          <button className="close-button" onClick={() => setError(null)}>×</button>
        </div>
      )}
    </ErrorContext.Provider>
  );
}; 