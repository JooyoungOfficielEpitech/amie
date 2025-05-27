import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface LoginResponse {
  token: string;
}

interface User {
  id: string;
  email: string;
  nickname: string;
  gender: string;
  createdAt: string;
  isActive: boolean;
  isWaitingForMatch: boolean;
  matchedRoomId: string | null;
}

export const adminApi = {
  login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    try {
      const response = await axios.post(`${API_URL}/admin/login`, {
        email,
        password
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '로그인에 실패했습니다.'
      };
    }
  },

  getUsers: async (): Promise<ApiResponse<User[]>> => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return {
        success: true,
        data: response.data.map((user: any) => ({
          ...user,
          isActive: true,
          isWaitingForMatch: user.isWaitingForMatch || false,
          matchedRoomId: user.matchedRoomId || null
        }))
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '사용자 목록을 가져오는데 실패했습니다.'
      };
    }
  },

  toggleUserStatus: async (userId: string, isActive: boolean): Promise<ApiResponse<void>> => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(
        `${API_URL}/admin/users/${userId}/status`,
        { isActive },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '사용자 상태 변경에 실패했습니다.'
      };
    }
  }
}; 