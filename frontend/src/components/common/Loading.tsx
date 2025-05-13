import React from 'react';

interface LoadingProps {
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = '로딩 중...' }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem',
      height: '100%',
      textAlign: 'center' 
    }}>
      <div className="spinner" style={{
        width: '40px',
        height: '40px',
        margin: '1rem auto',
        border: '4px solid rgba(0, 0, 0, 0.1)',
        borderTopColor: '#3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p>{message}</p>
      
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Loading; 