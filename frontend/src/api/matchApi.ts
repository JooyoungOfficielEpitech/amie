import axiosInstance from './axiosConfig';

export const matchApi = {
  requestMatch: async () => {
    try {
      const response = await axiosInstance.post('/api/match/request');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getStatus: async () => {
    try {
      const response = await axiosInstance.get('/api/match/status');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  cancelMatch: async () => {
    try {
      const response = await axiosInstance.post('/api/match/cancel');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}; 