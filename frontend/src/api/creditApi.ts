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
      const response = await axiosInstance.get('/credit/usage-info');
      return response.data;
    } catch (error) {
      console.error('🔴 Credit Usage Info API 오류:', error);
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