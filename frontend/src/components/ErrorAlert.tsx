import React, { useEffect } from 'react';
import { useError } from '../contexts/ErrorContext';

interface ErrorAlertProps {
  autoHideAfter?: number; // ms
}

// 에러 발생 시 간단하게 표시되는 알림 컴포넌트
const ErrorAlert: React.FC<ErrorAlertProps> = ({ autoHideAfter = 5000 }) => {
  const { error, setError } = useError();

  // 자동으로 에러 메시지 숨기기
  useEffect(() => {
    if (error && autoHideAfter > 0) {
      const timer = setTimeout(() => {
        setError(null);
      }, autoHideAfter);

      return () => clearTimeout(timer);
    }
  }, [error, autoHideAfter, setError]);

  if (!error) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#f8d7da',
        borderColor: '#f5c6cb',
        color: '#721c24',
        padding: '12px 20px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 9999,
        maxWidth: '350px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>{error}</span>
      <button
        onClick={() => setError(null)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          marginLeft: '16px',
          color: '#721c24',
        }}
      >
        &times;
      </button>
    </div>
  );
};

export default ErrorAlert; 