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
      const response = await axiosInstance.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('[authApi.login] API 호출 오류:', error);
      throw error;
    }
  },
  
  register: async (userData: RegisterData) => {
    try {
      const response = await axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('[authApi.register] API 호출 오류:', error);
      throw error;
    }
  },
  
  socialLogin: async (data: SocialLoginData) => {
    try {
      const response = await axiosInstance.post('/auth/social-login', data);
      return response.data;
    } catch (error) {
      console.error('[authApi.socialLogin] API 호출 오류:', error);
      throw error;
    }
  },
  
  socialRegister: async (userData: SocialRegisterData) => {
    try {
      const response = await axiosInstance.post('/auth/social-register', userData);
      return response.data;
    } catch (error) {
      console.error('[authApi.socialRegister] API 호출 오류:', error);
      throw error;
    }
  }
}; 