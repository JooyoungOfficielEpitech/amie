import axiosInstance from './axiosConfig';

export interface SendMessageData {
  roomId: string;
  message: string;
}

export interface ChatRoomStatus {
  success: boolean;
  isActive?: boolean;
  message?: string;
  user1Left?: boolean;
  user2Left?: boolean;
  user1Id?: string;
  user2Id?: string;
}

export const getChatRoomStatus = async (roomId: string): Promise<ChatRoomStatus> => {
    try {
        const response = await axiosInstance.get(`/chat/room/${roomId}/status`);
        return response.data;
    } catch (error: any) {
        console.error(`Error fetching chat room status for ${roomId}:`, error);
        const message = error.response?.data?.error || error.message || '채팅방 상태 확인 중 오류 발생';
        return { success: false, message };
    }
};

export const getChatHistory = async (roomId: string): Promise<{ success: boolean; messages?: any[]; message?: string }> => {
    try {
        const response = await axiosInstance.get(`/chat/room/${roomId}/history`);
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
      const response = await axiosInstance.get('/chat/rooms');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getRoom: async (roomId: string) => {
    try {
      const response = await axiosInstance.get(`/chat/room/${roomId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  sendMessage: async (data: SendMessageData) => {
    try {
      const response = await axiosInstance.post('/chat/message', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getChatRoomStatus,
  getChatHistory
}; 