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
      const response = await axiosInstance.get('/api/credit/current');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getLogs: async () => {
    try {
      const response = await axiosInstance.get('/api/credit/logs');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getUsageInfo: async () => {
    try {
      const response = await axiosInstance.get('/api/credit/usage-info');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  charge: async (data: ChargeData) => {
    try {
      const response = await axiosInstance.post('/api/credit/charge', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  use: async (data: UseData) => {
    try {
      const response = await axiosInstance.post('/api/credit/use', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}; 