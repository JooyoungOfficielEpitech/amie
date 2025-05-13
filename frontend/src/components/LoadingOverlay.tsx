import React from 'react';
import { useLoading } from '../contexts/LoadingContext';

// 로딩 상태일 때만 표시되는 오버레이 컴포넌트
const LoadingOverlay: React.FC = () => {
  const { loading, loadingMessage } = useLoading();

  if (!loading) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        {loadingMessage && (
          <p
            style={{
              margin: '10px 0 0 0',
              fontSize: '14px',
              color: '#333',
            }}
          >
            {loadingMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay; 