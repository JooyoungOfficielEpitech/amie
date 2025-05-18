import axiosInstance from './axiosConfig';

export const matchApi = {
  requestMatch: async () => {
    try {
      const response = await axiosInstance.post('/match/request');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getStatus: async () => {
    try {
      const response = await axiosInstance.get('/match/status');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  cancelMatch: async () => {
    try {
      const response = await axiosInstance.post('/match/cancel');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}; 