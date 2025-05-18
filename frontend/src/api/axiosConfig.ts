import axios from 'axios';

// ===================== Axios 디버깅 코드 (나중에 제거) =====================
console.log('🔍 === Axios 설정 디버깅 시작 ===');
console.log('🔹 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('🔹 예상되는 API 요청 경로:', `${import.meta.env.VITE_API_BASE_URL || ''}/api/credit/usage-info`);
console.log('🔍 === Axios 설정 디버깅 종료 ===');
// =========================================================================

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
    
    // 프로덕션 환경에서 API 경로 조정 (Nginx 프록시 고려)
    if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL && config.url) {
      // 절대 URL이 아닌 요청만 처리 (https://로 시작하지 않는 경우)
      if (!config.url.startsWith('http')) {
        // API 경로 패턴 확인 및 변환
        // 1. /api/로 시작하는 경로 처리
        if (config.url.startsWith('/api/')) {
          const newUrl = config.url.replace('/api', '');
          console.log(`[API] 경로 변환: ${config.url} -> ${newUrl} (프로덕션 환경 자동 조정)`);
          config.url = newUrl;
        }
        // 2. /auth/로 시작하는 경로 처리
        else if (config.url.startsWith('/auth/')) {
          const newUrl = config.url.replace('/auth', '');
          console.log(`[API] 경로 변환: ${config.url} -> ${newUrl} (프로덕션 환경 자동 조정)`);
          config.url = newUrl;
        }
        // 3. 다른 백엔드 API 경로 처리 (필요에 따라 추가)
        else if (config.url.startsWith('/user/') || 
                config.url.startsWith('/credit/') || 
                config.url.startsWith('/match/') ||
                config.url.startsWith('/chat/')) {
          // 이미 접두사가 제거된 경로는 그대로 유지
          console.log(`[API] 경로 유지: ${config.url} (이미 처리된 경로)`);
        }
        // 4. 이외 다른 경로는 경고 로그 출력
        else {
          console.warn(`[API] 처리되지 않은 경로 패턴: ${config.url}`);
        }
        
        // 추가 디버깅: 최종 URL 출력
        const finalUrl = `${config.baseURL || ''}${config.url}`;
        console.log(`[API] 최종 요청 URL: ${finalUrl}`);
      } else {
        console.warn(`[API] 절대 URL 감지: ${config.url} (변환 없이 그대로 사용)`);
      }
    }
    
    // ===================== 요청 디버깅 코드 (나중에 제거) =====================
    // 전체 URL 로깅
    const fullUrl = `${config.baseURL || ''}${config.url}`;
    console.log(`🔶 API 요청: [${config.method?.toUpperCase()}] ${fullUrl}`);
    console.log('🔹 요청 헤더:', config.headers);
    console.log('🔹 토큰 존재 여부:', token ? '있음' : '없음');
    // =========================================================================
    
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