import axios from 'axios';

// 환경 변수에서 API URL 가져오기
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT || 10000);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 설정
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API 요청:', config.url, config.method, config.data);
    return config;
  },
  (error) => {
    console.error('API 요청 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('API 응답:', response.config.url, response.status, response.data);
    return response;
  },
  (error) => {
    // 에러 처리 로직
    console.error('API 응답 에러:', error.config?.url, error.message);
    
    if (error.response) {
      // 서버 응답이 있는 경우
      console.error('서버 에러 응답:', error.response.status, error.response.data);
      
      if (error.response.status === 401) {
        // 인증 에러 - 로그인 페이지로 리다이렉트
        localStorage.removeItem('token');
        // 필요시 리다이렉트 로직 추가
      }
    } else if (error.request) {
      // 요청은 이루어졌지만 응답이 없는 경우 (서버에 연결할 수 없음)
      console.error('서버 연결 실패:', error.request);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 