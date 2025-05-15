import axios from 'axios';

// 기본 axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000, // 타임아웃 10초로 설정
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰 헤더에 추가하는 헬퍼 함수
const getAuthToken = () => {
  // 먼저 새 표준 키에서 토큰 시도
  let token = localStorage.getItem('accessToken');
  
  // 없으면 레거시 키에서 시도
  if (!token) {
    token = localStorage.getItem('token');
    
    // 레거시 토큰이 있으면 새 형식으로 마이그레이션
    if (token) {
      console.log('[API] Migrating legacy token to new format');
      localStorage.setItem('accessToken', token);
    }
  }
  
  if (!token) {
    console.warn('[API] No authentication token found');
    return null;
  }
  
  // Bearer 접두사가 있으면 제거
  if (token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  
  // JSON 형식인지 시도
  try {
    const tokenObj = JSON.parse(token);
    if (tokenObj.token || tokenObj.accessToken) {
      token = tokenObj.token || tokenObj.accessToken;
    }
  } catch (e) {
    // JSON이 아니면 그대로 사용
  }
  
  return token;
};

// 요청 인터셉터 설정
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 요청 로깅 (디버깅용)
    console.log(`API 요청: [${config.method?.toUpperCase()}] ${config.url}`, config.params || {});
    
    return config;
  },
  (error) => {
    console.error('API 요청 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
axiosInstance.interceptors.response.use(
  (response) => {
    // 성공 응답 처리
    console.log(`API 응답: [${response.status}] ${response.config.url}`, 
      response.data ? { success: response.data.success } : {});
    return response;
  },
  (error) => {
    // 오류 응답 처리
    if (error.response) {
      console.error(`API 오류: [${error.response.status}] ${error.config?.url}`, 
        error.response.data);
      
      // 401 오류 (인증 실패)
      if (error.response.status === 401) {
        console.warn('[API] Authentication failed (401), cleaning up credentials');
        // 로컬 스토리지에서 토큰 제거 및 모든 데이터 초기화
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.clear(); // 모든 localStorage 데이터 삭제
        
        // 로그인 페이지로 리다이렉트 - 단, 루프 방지
        const currentPath = window.location.pathname;
        if (currentPath !== '/' && currentPath !== '/login') {
          console.log('[API] Redirecting to login page');
          setTimeout(() => {
            window.location.href = '/';
          }, 3000); // 3초 지연으로 사용자에게 알림 표시 시간 제공
        }
      }
    } else if (error.request) {
      console.error('API 요청에 대한 응답이 없음:', error.request);
    } else {
      console.error('API 설정 오류:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 