/**
 * 토큰 유효성 검사 함수
 * @returns {boolean} 토큰 유효 여부
 */
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('token');
  
  // 토큰이 없으면 유효하지 않음
  if (!token) {
    return false;
  }
  
  // JWT 토큰의 만료 시간 확인 (선택적)
  try {
    // JWT는 'header.payload.signature' 형식
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    
    // 만료 시간이 있고, 현재 시간보다 이전이면 만료된 것
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

/**
 * 토큰 저장 함수
 * @param {string} token - JWT 토큰
 */
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * 토큰 제거 함수
 */
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * 토큰 가져오기 함수
 * @returns {string | null} JWT 토큰 또는 null
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * 인증 여부 확인 함수
 * @returns {boolean} 인증 여부
 */
export const isAuthenticated = (): boolean => {
  return isTokenValid();
};

/**
 * 인증 토큰을 포함하여 fetch 요청을 보내는 함수
 * @param {string} url - 요청 URL (상대 경로 또는 절대 경로)
 * @param {RequestInit} options - fetch 옵션
 * @returns {Promise<Response>} fetch 응답 Promise
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken(); // 기존 getToken 함수 사용

  const headers = new Headers(options.headers); // 기존 헤더 복사

  // 토큰이 있으면 Authorization 헤더 추가
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 기본적으로 Content-Type을 application/json으로 설정
  // 단, options에 Content-Type이 이미 있거나, body가 FormData인 경우는 제외
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
     headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers, // 업데이트된 헤더 사용
  };

  // 환경 변수에서 API 기본 주소 가져오기 (Vite 기준)
  // Create React App의 경우 process.env.REACT_APP_API_BASE_URL 사용
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''; // 기본값은 빈 문자열
  
  // URL이 상대 경로인 경우( /로 시작) 기본 주소를 앞에 붙임
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;

  // 수정된 URL과 설정으로 fetch 요청
  return fetch(fullUrl, config);
}; 