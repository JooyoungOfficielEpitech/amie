import axiosInstance from './axiosConfig';

export const adminApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/admin/login', {
        email,
        password
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getUsers: async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axiosInstance.get('/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  toggleUserStatus: async (userId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axiosInstance.patch(
        `/admin/users/${userId}/status`,
        { isActive },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}; 