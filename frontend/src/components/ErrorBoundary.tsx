import  { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  // 에러 발생 시 상태 업데이트
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // 에러 정보 로깅
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('에러 바운더리에서 에러 발생:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  // 에러 상태 초기화
  public resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }
      
      // 기본 폴백 UI
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>오류가 발생했습니다</h2>
          <p>{error?.message || '알 수 없는 오류가 발생했습니다.'}</p>
          <button 
            onClick={this.resetError}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary; 