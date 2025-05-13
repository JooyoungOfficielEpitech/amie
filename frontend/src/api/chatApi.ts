import axiosInstance from './axiosConfig';

export interface SendMessageData {
  roomId: string;
  message: string;
}

export const getChatRoomStatus = async (roomId: string): Promise<{ success: boolean; isActive?: boolean; message?: string }> => {
    try {
        const response = await axiosInstance.get(`/api/chat/room/${roomId}/status`);
        return response.data; // Expecting { success: boolean, isActive: boolean }
    } catch (error: any) {
        console.error(`Error fetching chat room status for ${roomId}:`, error);
        const message = error.response?.data?.error || error.message || '채팅방 상태 확인 중 오류 발생';
        return { success: false, message };
    }
};

export const getChatHistory = async (roomId: string): Promise<{ success: boolean; messages?: any[]; message?: string }> => {
    try {
        const response = await axiosInstance.get(`/api/chat/room/${roomId}/history`);
        return response.data; // Expecting { success: boolean, messages: ChatMessage[] }
    } catch (error: any) {
        console.error(`Error fetching chat history for ${roomId}:`, error);
        const message = error.response?.data?.error || error.message || '채팅 기록 조회 중 오류 발생';
        return { success: false, message };
    }
};

export const chatApi = {
  getRooms: async () => {
    try {
      const response = await axiosInstance.get('/api/chat/rooms');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getRoom: async (roomId: string) => {
    try {
      const response = await axiosInstance.get(`/api/chat/room/${roomId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  sendMessage: async (data: SendMessageData) => {
    try {
      const response = await axiosInstance.post('/api/chat/message', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getChatRoomStatus,
  getChatHistory
}; 