import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { chatApi } from '../api/chatApi';
import { useAuth } from './AuthContext';

export interface ChatRoom {
  roomId: string;
  user: {
    id: string;
    nickname: string;
    profileImage: string;
  };
}

export interface ChatMessage {
  senderId: string;
  message: string;
  createdAt: string;
}

interface ChatContextType {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, message: string) => Promise<boolean>;
  setCurrentRoom: (roomId: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 인증 상태가 변경되면 채팅방 목록 불러오기
  useEffect(() => {
    if (isLoggedIn) {
      fetchRooms();
    } else {
      setRooms([]);
      setCurrentRoomId(null);
      setMessages([]);
    }
  }, [isLoggedIn]);

  // 현재 채팅방이 변경되면 메시지 불러오기
  useEffect(() => {
    if (currentRoomId) {
      fetchMessages(currentRoomId);
    } else {
      setMessages([]);
    }
  }, [currentRoomId]);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await chatApi.getRooms();
      
      if (response.success && response.chatRooms) {
        setRooms(response.chatRooms);
      } else {
        throw new Error('채팅방 목록을 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '채팅방 목록을 가져오는 중 오류가 발생했습니다.');
      console.error('Chat rooms fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await chatApi.getRoom(roomId);
      
      if (response.success && response.messages) {
        setMessages(response.messages);
      } else {
        throw new Error('메시지를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '메시지를 가져오는 중 오류가 발생했습니다.');
      console.error('Messages fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (roomId: string, message: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await chatApi.sendMessage({ roomId, message });
      
      if (response.success) {
        // 메시지 전송 후 최신 메시지 다시 불러오기
        await fetchMessages(roomId);
        return true;
      } else {
        throw new Error('메시지 전송에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '메시지 전송 중 오류가 발생했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setCurrentRoom = (roomId: string | null) => {
    setCurrentRoomId(roomId);
  };

  const value = {
    rooms,
    currentRoomId,
    messages,
    loading,
    error,
    fetchRooms,
    fetchMessages,
    sendMessage,
    setCurrentRoom
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; 