import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { useAuth } from './AuthContext';

interface SocketContextType {
  matchSocket: any | null;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  matchSocket: null,
  isConnected: false,
  reconnect: () => {},
  disconnect: () => {}
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<any | null>(null);
  const { token, userId } = useAuth(); // AuthContext에서 인증 정보 가져오기

  // 소켓 연결 초기화 함수
  const initSocket = () => {
    if (!token || !userId) {
      console.log('인증 정보가 없어서 소켓 연결을 시도하지 않습니다.');
      return;
    }

    // 이미 연결된 소켓이 있으면 먼저 연결 해제
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('소켓 연결 초기화 중...');
    
    // 소켓 연결 설정
    const socket = io(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/match`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      autoConnect: true
    });

    socketRef.current = socket;

    // 소켓 이벤트 리스너 설정
    socket.on('connect', () => {
      console.log('소켓 연결 성공:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('소켓 연결 해제:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('소켓 연결 오류:', error.message);
      setIsConnected(false);
    });

    return socket;
  };

  // 소켓 재연결 함수
  const reconnect = () => {
    console.log('소켓 재연결 시도...');
    initSocket();
  };

  // 소켓 연결 해제 함수
  const disconnect = () => {
    console.log('소켓 연결 해제 중...');
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  };

  // 인증 정보(토큰, 유저ID)가 변경될 때마다 소켓 재연결
  useEffect(() => {
    initSocket();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log('소켓 컨텍스트 정리 중...');
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.disconnect();
      }
    };
  }, [token, userId]);

  return (
    <SocketContext.Provider value={{ 
      matchSocket: socketRef.current, 
      isConnected, 
      reconnect, 
      disconnect 
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 