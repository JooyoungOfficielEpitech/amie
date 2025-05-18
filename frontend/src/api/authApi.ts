import axiosInstance from './axiosConfig';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nickname: string;
  birthYear: number;
  height: number;
  city: string;
  gender: 'male' | 'female';
  profileImages: string[];
  businessCardImage?: string;
}

export interface SocialLoginData {
  provider: 'google' | 'kakao';
  token: string;
}

export interface SocialRegisterData {
  provider: 'google' | 'kakao';
  socialEmail: string;
  nickname: string;
  birthYear: number;
  height: number;
  city: string;
  gender: 'male' | 'female';
  profileImages: string[];
  businessCardImage?: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    try {
      console.log('[authApi.login] 로그인 요청:', credentials);
      const response = await axiosInstance.post('/auth/login', credentials);
      console.log('[authApi.login] API 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('[authApi.login] API 호출 오류:', error);
      throw error;
    }
  },
  
  register: async (userData: RegisterData) => {
    try {
      console.log("[authApi.register] 회원가입 요청:", userData);
      const response = await axiosInstance.post('/auth/register', userData);
      console.log("[authApi.register] API 응답:", response.data);
      return response.data;
    } catch (error) {
      console.error('[authApi.register] API 호출 오류:', error);
      throw error;
    }
  },
  
  socialLogin: async (data: SocialLoginData) => {
    try {
      console.log('[authApi.socialLogin] 소셜 로그인 요청:', data);
      const response = await axiosInstance.post('/auth/social-login', data);
      console.log('[authApi.socialLogin] API 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('[authApi.socialLogin] API 호출 오류:', error);
      throw error;
    }
  },
  
  socialRegister: async (userData: SocialRegisterData) => {
    try {
      console.log('[authApi.socialRegister] 소셜 회원가입 요청:', userData);
      const response = await axiosInstance.post('/auth/social-register', userData);
      console.log('[authApi.socialRegister] API 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('[authApi.socialRegister] API 호출 오류:', error);
      throw error;
    }
  }
}; 