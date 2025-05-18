import axiosInstance from './axiosConfig';

export interface ChargeData {
  amount: number;
  description?: string;
}

export interface UseData {
  amount: number;
  service: string;
  description?: string;
}

export const creditApi = {
  getCurrent: async () => {
    try {
      const response = await axiosInstance.get('/credit/current');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getLogs: async () => {
    try {
      const response = await axiosInstance.get('/credit/logs');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getUsageInfo: async () => {
    try {
      // ===================== API 요청 디버깅 코드 (나중에 제거) =====================
      console.log('🔍 === Credit Usage Info API 호출 시작 ===');
      console.log('🔹 요청 경로:', '/credit/usage-info');
      console.log('🔹 환경변수 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
      console.log('🔹 예상 전체 URL:', `${import.meta.env.VITE_API_BASE_URL || ''}/credit/usage-info`);
      // ===========================================================================
      
      const response = await axiosInstance.get('/credit/usage-info');
      
      // ===================== API 응답 디버깅 코드 (나중에 제거) =====================
      console.log('🔍 === Credit Usage Info API 응답 ===');
      console.log('🔹 응답 데이터:', response.data);
      console.log('🔍 === Credit Usage Info API 호출 종료 ===');
      // ===========================================================================
      
      return response.data;
    } catch (error) {
      // ===================== API 오류 디버깅 코드 (나중에 제거) =====================
      console.error('🔴 Credit Usage Info API 오류:', error);
      // ===========================================================================
      throw error;
    }
  },
  
  charge: async (data: ChargeData) => {
    try {
      const response = await axiosInstance.post('/credit/charge', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  use: async (data: UseData) => {
    try {
      const response = await axiosInstance.post('/credit/use', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}; 